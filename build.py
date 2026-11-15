import re,os
os.chdir('/workspace/asteroid-mining')
three=open('three.min.js').read()
three=re.sub(r"^console\.warn\([^;]*\);","",three,count=1)
css=open('src/style.css').read();body=open('src/body.html').read()
files=['sbdb_snapshot','data','state','events','continuum','studio','audio','music','world','ui_core','pov','panels','he3','opener','main']
js='\n'.join(open(f'src/{f}.js').read() for f in files)
html=f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#02040b"><meta name="description" content="Operation Cosmoform (Asteroid Belt Mining Continuum) — a mobile-first arcade mission-design game: self-replicating drone swarms build propellant waystations for crewed ships. Built on JPL Small-Body Database data.">
<title>Operation Cosmoform · Asteroid Belt Mining Continuum</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='30' fill='%233ef0ff'/%3E%3C/svg%3E">
<style>{css}</style></head><body>
{body}
<script>/* three.js r150 (MIT) */{three}</script>
<script>{js}</script>
</body></html>'''
open('asteroid-belt-mining-continuum.html','w').write(html)
print(len(html))
