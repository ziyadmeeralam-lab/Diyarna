"""Import reviewed repair assets without replacing unrelated mappings."""
import json,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
assets=json.loads((root/'src/data/assets.json').read_text(encoding='utf-8'))
generated_root=Path(sys.argv[1])
generated={
 'makkah-foods-1':'exec-0c8806c5-94d7-4c95-a537-4ff3f9520445.png',
 'qassim-foods-3':'exec-13393a29-7213-48a9-87dc-13097b7a57da.png',
 'riyadh-landing-foods':'exec-0b485de3-d4cb-49f9-9c97-7052fafc0cc6.png',
 'makkah-landing-foods':'exec-d3f13426-a573-43ff-ad05-e1c92832d5f5.png',
 'asir-landing-foods':'exec-266d3412-815d-4f1a-bf3c-f3b0f146588f.png',
 'qassim-landing-foods':'exec-58052342-c37e-4f49-976e-fbeb0481d39a.png',
 'riyadh-foods-2':'exec-1a080266-5dfa-4d90-95b6-be3b5dc07628.png'
}
def save(id,path,metadata):
 image=Image.open(path).convert('RGB');image.thumbnail((1600,1100))
 filename=f'{id}-repair.webp';image.save(root/'public/assets'/filename,quality=88)
 assets[id]={'src':f'/assets/{filename}',**metadata}
for id,name in generated.items():
 save(id,generated_root/name,{'source':'OpenAI built-in imagegen; docs/generated-assets.md','type':'generated-illustration'})
if len(sys.argv)>2:
 manifest=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8-sig'))
 for asset in manifest:
  if asset.get('file') and asset.get('id'):
   save(asset['id'],asset['file'],{k:v for k,v in asset.items() if k not in ['id','file']})
 (root/'docs/repair-image-provenance.json').write_text(json.dumps([{k:v for k,v in a.items() if k!='file'} for a in manifest],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assets['asir-foods-1']['position']='38% 50%'
assets['riyadh-foods-3']['position']='53% 54%'
(root/'src/data/assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Current asset mappings:',len(assets))
