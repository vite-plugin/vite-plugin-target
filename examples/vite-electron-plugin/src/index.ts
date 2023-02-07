import { ipcRenderer } from 'electron'
import fs from 'fs'

console.log('ipcRenderer:', ipcRenderer)

document.getElementById('app')!.innerHTML = `
<h1>Hi there 👋</h1>
<hr />
<pre>
<strong>fs API:</strong>

${Object.keys(fs).join('\n')}
</pre>
`
