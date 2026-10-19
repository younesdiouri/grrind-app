"""Bake a hand-painted look into a generated character's base colour (Waven-like target).

Meshy textures colour only. This bakes what a texture artist would paint on top, once and
deterministically: occlusion in creases, a two-tone light from above, darker cavities and
lighter ridges. Unity then shows the result almost unlit. Geometry and UVs are untouched.

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
        --python spikes/art-source/bake_painted.py -- <model.fbx> <base_color.png> <out.png> [size]
"""
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
model, albedo_path, target_path = args[:3]
size = int(args[3]) if len(args) > 3 else 4096

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=model)
mesh = next(o for o in bpy.context.scene.objects if o.type == "MESH")

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 64
scene.render.bake.margin = 16

target = bpy.data.images.new("painted", size, size)
material = bpy.data.materials.new("Painted bake")
material.use_nodes = True
mesh.data.materials.clear()
mesh.data.materials.append(material)
nodes, links = material.node_tree.nodes, material.node_tree.links
nodes.clear()


def node(kind, **settings):
    created = nodes.new(kind)
    for key, value in settings.items():
        setattr(created, key, value)
    return created


def ramp(stops):
    created = node("ShaderNodeValToRGB")
    elements = created.color_ramp.elements
    while len(elements) > len(stops):
        elements.remove(elements[-1])
    while len(elements) < len(stops):
        elements.new(0)
    for element, (position, colour) in zip(elements, stops):
        element.position = position
        element.color = (*colour, 1)
    return created


albedo = node("ShaderNodeTexImage", image=bpy.data.images.load(albedo_path))
geometry = node("ShaderNodeNewGeometry")

# Two-tone painted light: warm from above and in front, cool shadow tint below.
light_dir = node("ShaderNodeVectorMath", operation="DOT_PRODUCT")
light_dir.inputs[1].default_value = (0.0, -0.45, 0.89)
links.new(geometry.outputs["Normal"], light_dir.inputs[0])
light = ramp([(0.0, (0.5, 0.45, 0.62)), (0.42, (0.6, 0.55, 0.72)), (0.58, (1.0, 0.96, 0.9)), (1.0, (1.12, 1.07, 1.0))])
remap = node("ShaderNodeMapRange")
remap.inputs["From Min"].default_value = -1
links.new(light_dir.outputs["Value"], remap.inputs["Value"])
links.new(remap.outputs["Result"], light.inputs["Fac"])

# Painted occlusion: only local creases (fingers, armpits, under the hair), not global shadow.
occlusion = node("ShaderNodeAmbientOcclusion", samples=16)
occlusion.inputs["Distance"].default_value = 0.12
crease = ramp([(0.0, (0.3, 0.24, 0.32)), (0.85, (1.0, 1.0, 1.0))])
links.new(occlusion.outputs["AO"], crease.inputs["Fac"])

# Cavities darker, ridges lighter: the painted edge lines and highlights.
edges = ramp([(0.4, (0.45, 0.38, 0.42)), (0.5, (1.0, 1.0, 1.0)), (0.6, (1.22, 1.18, 1.12))])
links.new(geometry.outputs["Pointiness"], edges.inputs["Fac"])

lit = node("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
lit.inputs["Factor"].default_value = 1
links.new(albedo.outputs["Color"], lit.inputs["A"])
links.new(light.outputs["Color"], lit.inputs["B"])
occluded = node("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
occluded.inputs["Factor"].default_value = 1
links.new(lit.outputs["Result"], occluded.inputs["A"])
links.new(crease.outputs["Color"], occluded.inputs["B"])
painted = node("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
painted.inputs["Factor"].default_value = 1
links.new(occluded.outputs["Result"], painted.inputs["A"])
links.new(edges.outputs["Color"], painted.inputs["B"])

emission = node("ShaderNodeEmission")
links.new(painted.outputs["Result"], emission.inputs["Color"])
output = node("ShaderNodeOutputMaterial")
links.new(emission.outputs["Emission"], output.inputs["Surface"])

bake_target = node("ShaderNodeTexImage", image=target)
nodes.active = bake_target
for obj in scene.objects:
    obj.select_set(obj == mesh)
bpy.context.view_layer.objects.active = mesh
bpy.ops.object.bake(type="EMIT")
target.filepath_raw = target_path
target.file_format = "PNG"
target.save()
print("baked", target_path)
