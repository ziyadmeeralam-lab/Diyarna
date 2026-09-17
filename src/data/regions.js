import arabic from './arabic.json';
import english from './english.json';

export const regionIds = ['riyadh', 'makkah', 'asir', 'qassim'];
export const categoryIds = ['places', 'foods', 'arts'];
export const regions = {
  riyadh: {name: {ar: 'منطقة الرياض', en: 'Riyadh Region'}, coordinate: [45.2, 23.8], background: 'riyadh-background'},
  makkah: {name: {ar: 'منطقة مكة', en: 'Makkah Region'}, coordinate: [40.6, 22.1], background: 'makkah-background'},
  asir: {name: {ar: 'منطقة عسير', en: 'Asir Region'}, coordinate: [42.8, 19.2], background: 'asir-places-1'},
  qassim: {name: {ar: 'منطقة القصيم', en: 'Qassim Region'}, coordinate: [43.1, 26.3], background: 'qassim-background'},
};
export const ui = {
  ar: {
    home: 'الرئيسية', map: 'الخريطة', country: 'المملكة العربية السعودية', more: 'المزيد',
    backMap: 'العودة إلى الخريطة', backRegion: 'العودة إلى',
    foods: 'الأكلات الشعبية', arts: 'الفنون الشعبية', places: 'الأماكن السياحية',
    mountains: 'الجبال', oases: 'الواحات', deserts: 'الصحاري', coasts: 'السواحل', heritage: 'التراث',
    layers: 'طبقات الخريطة', schematic: 'تمثيل جغرافي مبسّط', loading: 'جارٍ تحميل الخريطة',
    fallback: 'عرض الخريطة البديل', skip: 'الانتقال إلى المحتوى', unavailable: 'الصورة غير متاحة',
    notFound: 'الصفحة غير موجودة',
  },
  en: {
    home: 'Home', map: 'Map', country: 'Kingdom of Saudi Arabia', more: 'More',
    backMap: 'Back to map', backRegion: 'Back to', foods: 'Popular Foods', arts: 'Folk Arts', places: 'Tourist Places',
    mountains: 'Mountains', oases: 'Oases', deserts: 'Deserts', coasts: 'Coasts', heritage: 'Heritage',
    layers: 'Map layers', schematic: 'Simplified geographic representation', loading: 'Loading map',
    fallback: 'Alternative map view', skip: 'Skip to content', unavailable: 'Image unavailable',
    notFound: 'Page not found',
  },
};
export function getItems(region, category, language) {
  return arabic[region][category].map((item, index) => ({...item,
    ...(language === 'en' ? english[region][category][index] : {}),
  }));
}
export const pathFor = (region, category) => region ? `/regions/${region}${category ? `/${category}` : ''}` : '/';
