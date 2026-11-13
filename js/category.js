
function toggleMenu(force){
  const menu=document.getElementById('site-side-menu');
  const overlay=document.getElementById('site-overlay');
  if(!menu||!overlay)return;
  const shouldOpen=typeof force==='boolean'?force:!menu.classList.contains('active');
  menu.classList.toggle('active',shouldOpen);overlay.classList.toggle('active',shouldOpen);
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')toggleMenu(false)});
