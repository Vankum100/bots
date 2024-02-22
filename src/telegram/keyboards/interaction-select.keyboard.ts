import { ReplyKeyboardMarkup } from 'typegram/markup';

export const interactionSelectKeyboard: ReplyKeyboardMarkup = {
  resize_keyboard: true,
  keyboard: [
    [{ text: 'Подписаться' }, { text: 'Отписаться' }],
    [{ text: 'Показать все площадки' }],
  ],
};
