// Единая точка разбора ошибок RTK Query для админки. Раньше каждый из восьми catch-блоков
// в UsersSection/RolesSection повторял `err?.data?.Message ?? "Помилка"` с `err: any` —
// теперь это один типизированный хелпер без `any`.
//
// Бэкенд (AdminController) на неуспех отдаёт { Message: "..." }, но System.Text.Json на
// стороне сервиса настроен на camelCase, поэтому в проде поле приезжает как `message`.
// Проверяем оба варианта, чтобы не зависеть от регистра.
export const getAdminErrorMessage = (err: unknown, fallback = 'Помилка'): string => {
  if (typeof err !== 'object' || err === null) return fallback

  const data = (err as { data?: unknown }).data
  if (typeof data === 'string' && data.trim()) return data

  if (typeof data === 'object' && data !== null) {
    const body = data as { Message?: unknown; message?: unknown }
    if (typeof body.Message === 'string' && body.Message.trim()) return body.Message
    if (typeof body.message === 'string' && body.message.trim()) return body.message
  }

  const error = (err as { error?: unknown }).error
  if (typeof error === 'string' && error.trim()) return error

  return fallback
}
