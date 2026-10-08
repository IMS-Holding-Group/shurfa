// تحميل فيديو YouTube (نطاق nocookie) فقط بعد نقرة الزائر
(() => {
 document.querySelectorAll('[data-video]').forEach((box) => {
  const btn = box.querySelector('.video-play');
  if (!btn) return;
  btn.addEventListener('click', () => {
   const id = box.dataset.video || '';
   if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
   const frame = document.createElement('iframe');
   frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
   frame.title = box.dataset.videoTitle || 'فيديو';
   frame.setAttribute('allow', 'accelerometer; encrypted-media; gyroscope; picture-in-picture');
   frame.setAttribute('allowfullscreen', '');
   frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
   frame.loading = 'lazy';
   box.replaceChildren(frame);
  });
 });
})();
