import { resolveMessage } from "./messageResolver.js";

export const successResponse = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var data = {
    status: 1,
    message: message,
  };
  return res.status(200).json(data);
};

export const successResponseWithData = async function (
  res,
  key,
  data,
  lang = null,
) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var resData = {
    status: 1,
    message: message,
    data: data,
  };
  return res.status(200).json(resData);
};

export const ErrorResponse = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var data = {
    status: 0,
    message: message,
  };
  return res.status(500).json(data);
};

export const notFoundResponse = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var data = {
    status: 0,
    message: message,
  };
  return res.status(404).json(data);
};

export const unsuccessResponseWithoutData = async function (
  res,
  key,
  lang = null,
) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var resData = {
    status: 0,
    message: message,
  };
  return res.status(400).json(resData);
};

// Specialized status code (403 Forbidden)
export const forbiddenResponse = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var resData = {
    status: 0,
    message: message,
  };
  return res.status(403).json(resData);
};

// Specialized status code (409 Conflict)
export const conflictResponse = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var resData = {
    status: 0,
    message: message,
  };
  return res.status(409).json(resData);
};

export const unauthorizedResponse = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var data = {
    status: 0,
    message: message,
  };
  return res.status(401).json(data);
};

export const validationErrorWithData = async function (
  res,
  key,
  data,
  lang = null,
) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var resData = {
    status: 0,
    message: message,
    data: data,
  };
  return res.status(400).json(resData);
};

export const expireToken = async function (res, key, lang = null) {
  const langCode = lang || res.req?.lang || "en";
  const message = await resolveMessage(key, langCode);
  var data = {
    status: 0,
    message: message,
  };
  return res.status(401).json(data);
};
