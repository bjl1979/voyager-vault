// Voyager Vault – trip backup (.zip with real folders) and restore
const ZipIO = {
  safe(s) {
    return (s || 'file').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
  },
  ext(doc) {
    const m = (doc.fileName || '').match(/\.([a-z0-9]{2,5})$/i);
    if (m) return '.' + m[1].toLowerCase();
    if (doc.type === 'application/pdf') return '.pdf';
    if ((doc.type || '').startsWith('image/')) return '.' + doc.type.split('/')[1].replace('jpeg', 'jpg');
    return '';
  },
  backupName(trip) {
    return `${this.safe(trip.destination)}_${trip.start || 'trip'}`.replace(/ /g, '_');
  },

  async buildBackup(trip, docs, categories) {
    const zip = new JSZip();
    const root = zip.folder(this.backupName(trip));
    const used = new Set();
    const manifest = { app: 'voyager-vault', version: 1, exported: new Date().toISOString(), trip, docs: [] };
    for (const d of docs) {
      const cat = categories.find(c => c.id === d.category) || { folder: 'Other' };
      let base = `${cat.folder}/${this.safe(d.title)}`;
      let path = base + this.ext(d), n = 2;
      while (used.has(path.toLowerCase())) path = `${base} (${n++})${this.ext(d)}`;
      used.add(path.toLowerCase());
      root.file(path, d.blob);
      const { blob, ...meta } = d;
      manifest.docs.push({ ...meta, path });
    }
    root.file('trip.json', JSON.stringify(manifest, null, 2));
    root.file('README.txt',
      `Voyager Vault backup – ${trip.destination}${trip.country ? ', ' + trip.country : ''}\n` +
      `Dates: ${trip.start || '?'} to ${trip.end || '?'}\n` +
      `Documents: ${docs.length}\n\n` +
      `Each folder holds the original files. To bring this trip back into the app,\n` +
      `open Voyager Vault > Settings > Restore a backup, and pick this .zip file.\n`);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    return new File([blob], this.backupName(trip) + '.zip', { type: 'application/zip' });
  },

  async readBackup(file) {
    const zip = await JSZip.loadAsync(file);
    const mf = Object.keys(zip.files).find(p => /(^|\/)trip\.json$/.test(p));
    if (!mf) throw new Error('This zip is not a Voyager Vault backup (trip.json missing).');
    const prefix = mf.slice(0, mf.length - 'trip.json'.length);
    const manifest = JSON.parse(await zip.file(mf).async('string'));
    if (manifest.app !== 'voyager-vault') throw new Error('Unrecognised backup file.');
    const docs = [];
    for (const m of manifest.docs) {
      const f = zip.file(prefix + m.path);
      if (!f) continue;
      const data = await f.async('arraybuffer');
      const { path, ...meta } = m;
      docs.push({ ...meta, blob: new Blob([data], { type: m.type || '' }) });
    }
    return { trip: manifest.trip, docs };
  },
};
window.ZipIO = ZipIO;
