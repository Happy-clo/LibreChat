import { atom } from 'recoil';

const userLang = navigator.language || navigator.languages[0];

const lang = atom({
  key: 'lang',
  default: localStorage.getItem('lang') || `zh-CN`,
});

export default { lang };
