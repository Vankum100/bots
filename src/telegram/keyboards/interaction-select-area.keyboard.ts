import { ReplyKeyboardMarkup } from 'typegram/markup';
import {
  GET_MY_AREAS_TEXT,
  SELECT_AREA_TEXT,
  SELECT_CONTAINER_TEXT,
  SHOW_ALL_AREAS_TEXT,
  SUBSCRIBE_AREA_TEXT,
  UNSUBSCRIBE_AREA_TEXT,
} from '../constants/menu';

export const interactionSelectAreaKeyboard: ReplyKeyboardMarkup = {
  resize_keyboard: true,
  keyboard: [
    [{ text: SHOW_ALL_AREAS_TEXT }],
    [{ text: SELECT_AREA_TEXT }, { text: SELECT_CONTAINER_TEXT }],
    [{ text: SUBSCRIBE_AREA_TEXT }, { text: UNSUBSCRIBE_AREA_TEXT }],
    [{ text: GET_MY_AREAS_TEXT }],
  ],
};
