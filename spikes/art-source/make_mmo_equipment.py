"""Build the rigid sports loot in metres; fitting is reviewed on the character separately."""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'spikes/art-source/mmo-athlete-v1/gear'


def material(name, colour, metal=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = 0.48 if metal else 0.78
    return mat


def cylinder(name, x, radius, depth, mat, parent, segments=8, bevel=0.002):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=depth,
                                      rotation=(0, math.pi / 2, 0), location=(x, 0, 0))
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Rounded machined edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def weapon():
    iron = material('Iron', (0.035, 0.065, 0.115), 0.25)
    steel = material('Steel', (0.30, 0.39, 0.53), 0.32)
    brass = material('Brass', (0.63, 0.31, 0.055), 0.45)
    grip = material('Grip', (0.21, 0.105, 0.032))
    root = bpy.data.objects.new('HaltereEgo', None)
    bpy.context.collection.objects.link(root)
    root['handle_axis'] = 'X'
    root['grip_radius_m'] = 0.013
    cylinder('Brass handle', 0, 0.013, 0.18, brass, root, 16)
    for n in range(-5, 6):
        cylinder('Grip rib', n * 0.010, 0.014, 0.003, grip, root, 16, 0.0005)
    for side in (-1, 1):
        cylinder('Octagonal weight', side * 0.12, 0.089, 0.057, iron, root, bevel=0.005)
        cylinder('Steel bevel', side * 0.150, 0.076, 0.013, steel, root, bevel=0.003)
        cylinder('Brass hub', side * 0.160, 0.026, 0.013, brass, root, 16)
        cylinder('Hub inset', side * 0.168, 0.015, 0.004, grip, root, 12, 0.0007)
    return root


def bar(name, a, b, radius, mat, parent):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=(b-a).length,
                                      location=(a+b)/2)
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    obj.parent = parent
    obj.data.materials.append(mat)


def goggles():
    ivory = material('Ivory', (0.78, 0.70, 0.48))
    gold = material('Gold', (0.72, 0.39, 0.055), 0.38)
    amber = material('Amber', (0.48, 0.16, 0.018), 0.15)
    next(n for n in amber.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Roughness'].default_value = 0.25
    root = bpy.data.objects.new('CoursePoursuite', None)
    bpy.context.collection.objects.link(root)
    root['forward'] = '-Y'
    root['eye_centres_m'] = 'X = +/-0.050; Y = 0; Z = 0'
    for side in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=8,
                                        location=(side*.050, 0, 0),
                                        rotation=(math.pi/2, 0, 0),
                                        major_radius=.039, minor_radius=.008)
        rim = bpy.context.view_layer.objects.active
        rim.name = 'Ivory lens rim'
        rim.parent = root
        rim.data.materials.append(ivory)
        for polygon in rim.data.polygons:
            polygon.use_smooth = True
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12,
                                            location=(side*.050, 0, 0))
        lens = bpy.context.view_layer.objects.active
        lens.name = 'Amber lens'
        lens.scale = (.035, .006, .035)
        lens.parent = root
        lens.data.materials.append(amber)
        for polygon in lens.data.polygons:
            polygon.use_smooth = True
        points = [(side*.088, 0, 0), (side*.112, .026, 0),
                  (side*.115, .09, -.004), (side*.109, .115, -.016)]
        for a, b in zip(points, points[1:]):
            bar('Ivory temple', a, b, .0035, ivory, root)
        for feather in range(3):
            contour = [(side*.086, .012, -.014+feather*.012),
                       (side*(.153-feather*.009), .030, .023+feather*.018),
                       (side*(.157-feather*.009), .030, .044+feather*.018),
                       (side*.100, .015, .012+feather*.012)]
            vertices = contour + [(x, y+.004, z) for x, y, z in contour]
            faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                     (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
            if side < 0:
                faces = [tuple(reversed(face)) for face in faces]
            mesh = bpy.data.meshes.new('Wing feather')
            mesh.from_pydata(vertices, [], faces)
            obj = bpy.data.objects.new('Gold wing', mesh)
            bpy.context.collection.objects.link(obj)
            obj.parent = root
            mesh.materials.append(gold)
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            mod = obj.modifiers.new('Feather bevel', 'BEVEL')
            mod.width = .001
            mod.segments = 1
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bar('Nose bridge', (-.013, -.004, .005), (.013, -.004, .005), .0045, ivory, root)
    return root


def combine_materials(root):
    groups = {}
    for obj in root.children_recursive:
        if obj.type == 'MESH':
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for name, objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = root.name + '-' + name


def export_and_render(root):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    combine_materials(root)
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    meshes = [obj for obj in root.children_recursive if obj.type == 'MESH']
    for obj in meshes:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
    triangles = sum(len(obj.data.loop_triangles) for obj in meshes)
    assert triangles < 6000, f'Unexpected rigid-item budget: {triangles}'
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.fbx(filepath=str(OUTPUT / (root.name + '.fbx')), use_selection=True,
                             object_types={'EMPTY', 'MESH'}, add_leaf_bones=False,
                             bake_anim=False, axis_forward='-Z', axis_up='Y')
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / (root.name + '.glb')), use_selection=True,
                              export_format='GLB')
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x = 900
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value = (0.025, 0.035, 0.07, 1)
    next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value = 0.45
    scene.view_settings.view_transform = 'AgX'
    camera = bpy.data.objects.new('Gear camera', bpy.data.cameras.new('Gear camera'))
    scene.collection.objects.link(camera)
    camera.location = (0.55, -0.8, 0.42)
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 0.46
    scene.camera = camera
    for name, at, energy, size in [('Key', (-0.3, -0.5, 0.65), 30, 0.5),
                                   ('Fill', (0.4, 0.3, 0.3), 12, 0.4)]:
        lamp = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA'))
        scene.collection.objects.link(lamp)
        lamp.location = at
        lamp.rotation_euler = (-lamp.location).to_track_quat('-Z', 'Y').to_euler()
        lamp.data.energy = energy
        lamp.data.size = size
    scene.render.filepath = str(OUTPUT / (root.name + '.png'))
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / (root.name + '.blend')))
    report = {'item': root.name, 'triangles': triangles, 'units': 'metres',
              'attachment': 'origin at grip centre, handle along local X' if root.name == 'HaltereEgo' else 'origin between lenses, optical plane XZ, facing -Y',
              'status': 'Rigid asset only; character grip and all poses still require review.'}
    (OUTPUT / (root.name + '.json')).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    export_and_render(weapon())
