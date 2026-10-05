// The page name of a sample (`samples/<name>`, and `public/samples/<name>-<platform>.webp` for its
// screenshots), from its catalog slug (`<dir>/<file>`). Shared by the page generator and the
// sidebar. A Toolkit sample is `toolkit-<file>`: its file names repeat the core's (`bookmarks`).
export function sampleName(slug) {
  const [dir, file] = slug.split('/');
  return dir === 'toolkit' ? `toolkit-${file}` : file;
}
