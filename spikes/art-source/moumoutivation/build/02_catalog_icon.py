"""Render the approved source mesh for the server inventory, without changing the asset."""
from pathlib import Path
import bpy
from mathutils import Vector

asset = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(asset / 'source.glb'))
meshes = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']
points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector(tuple(min(point[i] for point in points) for i in range(3)))
maximum = Vector(tuple(max(point[i] for point in points) for i in range(3)))
centre = (minimum + maximum) / 2
span = max(maximum - minimum)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
camera = bpy.data.objects.new('Catalog camera', bpy.data.cameras.new('Catalog camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = span * 1.15
camera.location = centre + Vector((.25, -3, .3)) * span
camera.rotation_euler = (centre - camera.location).to_track_quat('-Z', 'Y').to_euler()
for offset, power in [((-2, -3, 4), 450), ((3, -1, 2), 180), ((0, 3, 3), 260)]:
    light = bpy.data.objects.new('Studio', bpy.data.lights.new('Studio', 'AREA'))
    scene.collection.objects.link(light)
    light.location = centre + Vector(offset) * span
    light.data.energy = power * span * span
    light.data.size = span * 3
    light.rotation_euler = (centre - light.location).to_track_quat('-Z', 'Y').to_euler()
scene.world = bpy.data.worlds.new('Studio world')
scene.world.color = (.3, .3, .3)
scene.render.filepath = str(asset / 'catalog-icon.png')
bpy.ops.render.render(write_still=True)
