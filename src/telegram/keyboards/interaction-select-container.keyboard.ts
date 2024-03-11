import {
  GET_MY_CONTAINERS_TEXT,
  SHOW_ALL_CONTAINERS_TEXT,
  SUBSCRIBE_CONTAINER_TEXT,
  UNSUBSCRIBE_CONTAINER_TEXT,
} from '../constants/menu';
import { ReplyKeyboardMarkup } from 'typegram/markup';

export const interactionSelectContainerKeyboard: ReplyKeyboardMarkup = {
  resize_keyboard: true,
  keyboard: [
    [{ text: SUBSCRIBE_CONTAINER_TEXT }, { text: UNSUBSCRIBE_CONTAINER_TEXT }],
    [{ text: GET_MY_CONTAINERS_TEXT }],
  ],
};
