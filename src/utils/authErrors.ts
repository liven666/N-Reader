export function isLoginRequiredError(error: unknown) {
  const message = typeof error === "string" ? error : String((error as any)?.message || "");
  return (
    message.includes("访客不能直接访问") ||
    message.includes("未登录") ||
    message.includes("必须先登录") ||
    message.includes("请登录")
  );
}

