"""Import researched assets and preserve attribution. Run after source manifest updates."""
import json, shutil, sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
manifest=json.loads(source.read_text(encoding='utf-8-sig'))
arabic=json.loads((root/'src/data/arabic.json').read_text(encoding='utf-8'))
output={}
for asset in manifest:
    if not asset.get('file') or not Path(asset['file']).exists(): continue
    category={'food':'foods','folk':'arts','folkArts':'arts'}.get(asset['category'],asset['category'])
    candidates=arabic[asset['region']][category]
    match=next((i for i in candidates if i['name']==asset['item']),None)
    if not match: print('Unmatched',ascii(asset['item']));continue
    destination=root/'public/assets'/f"{match['id']}.webp"
    image=Image.open(asset['file']).convert('RGB')
    image.thumbnail((1440,1100))
    image.save(destination,quality=86)
    output[match['id']]={'src':f'/assets/{destination.name}', 'source':asset.get('source'), 'rights':asset.get('rights'), 'type':'photograph'}
generated={
 'makkah-foods-2':'exec-5325d4da-9cd6-466d-ad0b-c31a7fa5810b.png',
 'makkah-foods-3':'exec-cc918d4c-72e7-4429-947b-6fe93f0aec2f.png',
 'asir-foods-2':'exec-ef5d817c-ed9f-45ee-9ac4-a880bbad0528.png'
}
generated_root=Path(sys.argv[2]) if len(sys.argv)>2 else None
for item,filename in generated.items():
    if not generated_root or not (generated_root/filename).exists():continue
    image=Image.open(generated_root/filename).convert('RGB');image.thumbnail((900,900))
    image.save(root/f'public/assets/{item}.webp',quality=87)
    output[item]={'src':f'/assets/{item}.webp','source':'OpenAI built-in imagegen; docs/generated-assets.md','type':'generated-illustration'}
(root/'src/data/assets.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Research text is retained for provenance only and is never rendered as cultural copy.
for entry in manifest: entry.pop('file',None)
(root/'docs/image-provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(output)} / 36 item images')
