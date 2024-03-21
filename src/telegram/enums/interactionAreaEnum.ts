import {
  GET_MY_AREAS_TEXT,
  SHOW_ALL_AREAS_TEXT,
  SUBSCRIBE_AREA_TEXT,
  UNSUBSCRIBE_AREA_TEXT,
  SHOW_ALL_CONTAINERS_TEXT,
  SUBSCRIBE_CONTAINER_TEXT,
  UNSUBSCRIBE_CONTAINER_TEXT,
  GET_MY_CONTAINERS_TEXT,
  BACK,
  SELECT_CONTAINER_TEXT,
  SELECT_AREA_TEXT,
  SELECT_DIFFERENT_AREA_TEXT,
} from '../constants/menu';

export enum AllowedActionsEnum {
  SHOW_ALL_AREAS = SHOW_ALL_AREAS_TEXT,
  SUBSCRIBE_AREA = SUBSCRIBE_AREA_TEXT,
  UNSUBSCRIBE_AREA = UNSUBSCRIBE_AREA_TEXT,
  GET_MY_AREAS = GET_MY_AREAS_TEXT,
  SHOW_ALL_CONTAINERS = SHOW_ALL_CONTAINERS_TEXT,
  SUBSCRIBE_CONTAINER = SUBSCRIBE_CONTAINER_TEXT,
  UNSUBSCRIBE_CONTAINER = UNSUBSCRIBE_CONTAINER_TEXT,
  GET_MY_CONTAINERS = GET_MY_CONTAINERS_TEXT,
  BACK_ACTION = BACK,
  SELECT_CONTAINER = SELECT_CONTAINER_TEXT,
  SELECT_AREA = SELECT_AREA_TEXT,
  SELECT_DIFFERENT_AREA = SELECT_DIFFERENT_AREA_TEXT,
}

export enum InteractionAreaEnum {
  INTERACTION_AREA_SUBSCRIBE = SUBSCRIBE_AREA_TEXT,
  INTERACTION_AREA_UNSUBSCRIBE = UNSUBSCRIBE_AREA_TEXT,
  INTERACTION_SHOW = SHOW_ALL_AREAS_TEXT,
  INTERACTION_SHOW_SUBSCRIBED_AREAS = GET_MY_AREAS_TEXT,
}
