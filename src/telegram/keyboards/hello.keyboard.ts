import { ReplyKeyboardMarkup } from 'typegram/markup';

export const helloKeyboard: ReplyKeyboardMarkup = {
  resize_keyboard: true,
  one_time_keyboard: true,
  is_persistent: true,
  keyboard: [[{ text: 'Авторизация по номеру', request_contact: true }]],
};
