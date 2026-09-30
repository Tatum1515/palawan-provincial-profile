export function titleCase(value = '') {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function safeText(value, fallback = 'For validation') {
  return value || fallback
}
