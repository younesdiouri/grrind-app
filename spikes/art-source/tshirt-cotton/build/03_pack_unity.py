"""Copy rebaked PBR maps and pack URP metallic RGB=0 / alpha=1-roughness."""
from pathlib import Path
import json
import shutil
from PIL import Image, ImageOps

ASSET=Path(__file__).resolve().parents[1]
DEST=ASSET.parents[2]/'spikes/Unity3D/Assets/Characters/Personalization'
for sex in ['Male','Female']:
    prefix=ASSET/'textures'/('PR_TshirtCotton_'+sex)
    for source,target in [('basecolor','BaseColor'),('normal','Normal')]:
        shutil.copyfile(str(prefix)+'_'+source+'.png',DEST/(sex+'_Tshirt_'+target+'.png'))
    roughness=Image.open(str(prefix)+'_roughness.png').convert('L')
    packed=Image.new('RGBA',roughness.size,(0,0,0,0))
    packed.putalpha(ImageOps.invert(roughness))
    packed.save(DEST/(sex+'_Tshirt_MetallicSmoothness.png'))
manifest=json.loads((ASSET/'asset-manifest.json').read_text())
manifest['texture_contract']={
    'size':2048,'base_color':'sRGB','normal':'linear, tangent-space OpenGL +Y',
    'metallic_smoothness':'linear, RGB=0 metal / alpha=1-roughness',
    'source':'Blender-authored restrained cotton, rebaked onto each accepted GameUV; ImageGen/Meshy retained as design reference',
    'separate_uv_atlas_per_body':True}
(ASSET/'asset-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Packed both body-specific URP texture sets.')
