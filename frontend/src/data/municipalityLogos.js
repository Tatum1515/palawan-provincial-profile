const municipalityLogoFiles = {
  Aborlan: 'aborlan.png',
  Agutaya: 'agutaya.png',
  Araceli: 'araceli.png',
  Balabac: 'balabac.png',
  Bataraza: 'bataraza.png',
  "Brooke's Point": 'brookes-point.webp',
  Busuanga: 'busuanga.png',
  Cagayancillo: 'cagayancillo.png',
  Coron: 'coron.png',
  Culion: 'culion.png',
  Cuyo: 'cuyo.png',
  Dumaran: 'dumaran.png',
  'El Nido': 'el-nido.png',
  Kalayaan: 'kalayaan.png',
  Linapacan: 'linapacan.png',
  Magsaysay: 'magsaysay.png',
  Narra: 'narra.png',
  Quezon: 'quezon.png',
  Rizal: 'rizal.png',
  Roxas: 'roxas.png',
  'San Vicente': 'san-vicente.png',
  'Sofronio Española': 'sofronio-espanola.png',
  Taytay: 'taytay.png',
}

export const getMunicipalityLogo = (name) => {
  const file = municipalityLogoFiles[name]
  return file ? `/images/municipalities/${file}` : null
}

export default municipalityLogoFiles
