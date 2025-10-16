export const fetchWithLoader = async (url: string, options: RequestInit) => {
  const showLoaderEvent = new Event('showLoader');
  const hideLoaderEvent = new Event('hideLoader');

  window.dispatchEvent(showLoaderEvent);
  try {
    const response = await fetch(url, options);
    return response;
  } finally {
    window.dispatchEvent(hideLoaderEvent);
  }
};
