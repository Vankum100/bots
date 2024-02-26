export const loggerMiddleware = (ctx, next) => {
  console.log(ctx.update.message);
  next();
};
