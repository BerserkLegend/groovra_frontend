
export const downloadFile = async (url: string, fileName?: string | null): Promise<void> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити файл: ${response.status}`)
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
