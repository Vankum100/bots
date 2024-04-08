import { ReplyKeyboardMarkup } from 'typegram/markup';
import {
  SELECT_AREAS_OR_CONTAINERS_TEXT,
  SHOW_MY_AREAS_OR_CONTAINERS_TEXT,
} from '../constants/menu';

export const interactionKeyboard: ReplyKeyboardMarkup = {
  resize_keyboard: true,
  one_time_keyboard: true,
  keyboard: [
    [{ text: SELECT_AREAS_OR_CONTAINERS_TEXT }],
    [{ text: SHOW_MY_AREAS_OR_CONTAINERS_TEXT }],
  ],
};
