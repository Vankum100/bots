import { ReplyKeyboardMarkup } from 'typegram/markup';

export const interactionSelectKeyboard: ReplyKeyboardMarkup = {
  resize_keyboard: true,
  keyboard: [
    [{ text: 'Показать все площадки' }],
    [{ text: 'Подписаться' }, { text: 'Отписаться' }],
    [{ text: 'Узнать свои площадки' }],
  ],
};
