// Automatisch erzeugt von scripts/build-items.mjs – nicht bearbeiten.
//
// Jedes in data/items/<ordner>/description.md benutzte Bild wird hier einzeln
// importiert. So übernimmt Vite genau diese Bilder (mit Hash im Dateinamen) in
// den Build – und nicht den Rest der Ordner, in denen auch Originalfotos und
// Zwischenstände liegen.
import img0 from '../../data/items/fidel_schlund/after.jpg'
import img1 from '../../data/items/fidel_schlund/before.webp'
import img2 from '../../data/items/radweg_eckarts/after.jpg'
import img3 from '../../data/items/radweg_eckarts/before.jpg'
import img4 from '../../data/items/radweg_flecken/after.jpg'
import img5 from '../../data/items/radweg_flecken/before.webp'
import img6 from '../../data/items/radweg_seifen/after.jpg'
import img7 from '../../data/items/radweg_seifen/orig.webp'
import img8 from '../../data/items/spielplatz_eckarts/after.jpg'
import img9 from '../../data/items/spielplatz_eckarts/before.jpg'

/** Repo-relativer Pfad aus data/items.json → gebündelte URL des Bildes. */
export const itemImages: Record<string, string> = {
  'data/items/fidel_schlund/after.jpg': img0,
  'data/items/fidel_schlund/before.webp': img1,
  'data/items/radweg_eckarts/after.jpg': img2,
  'data/items/radweg_eckarts/before.jpg': img3,
  'data/items/radweg_flecken/after.jpg': img4,
  'data/items/radweg_flecken/before.webp': img5,
  'data/items/radweg_seifen/after.jpg': img6,
  'data/items/radweg_seifen/orig.webp': img7,
  'data/items/spielplatz_eckarts/after.jpg': img8,
  'data/items/spielplatz_eckarts/before.jpg': img9,
}
