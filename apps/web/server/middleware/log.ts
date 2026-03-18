export default defineEventHandler((event) => {
  console.log('New request: ' + getRequestURL(event) + " from page " + event.path)
})
