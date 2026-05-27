export const errorLoadingImage = '/error_loading_image.png'
export const trollErrorLoadingImage = '/error_loading_image_troll.png'

export function handleImageError(event: Event, fallbackSrc: string = errorLoadingImage) {
  const image = event.target as HTMLImageElement | null
  if (!image || image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.src = fallbackSrc === errorLoadingImage && Math.random() < 0.001 ? trollErrorLoadingImage : fallbackSrc
}