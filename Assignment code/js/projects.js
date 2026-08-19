
let projects = [];
let selectedCategory = getCookie('projectCategory') || 'All';

fetch('data/projects.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Unable to load projects.json');
    }

    return response.json();
  })
  .then(data => {
    projects = data;
    restoreState();
    renderProjects();
  })
  .catch(error => {
    console.error(error);
    document.getElementById('projectGrid').innerHTML = '';

    const emptyMessage = document.getElementById('emptyMessage');
    emptyMessage.textContent = 'Projects could not be loaded.';
    emptyMessage.hidden = false;
  });

const searchInput = document.getElementById('searchInput');
const filterButtons = [...document.querySelectorAll('.filter-btn')];

searchInput.addEventListener('input', () => {
  localStorage.setItem('projectSearch', searchInput.value);
  renderProjects();
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    selectedCategory = button.dataset.category;
    setCookie('projectCategory', selectedCategory, 7);
    filterButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    renderProjects();
  });
});

function restoreState(){
  searchInput.value = localStorage.getItem('projectSearch') || '';
  filterButtons.forEach(b => b.classList.toggle('active', b.dataset.category === selectedCategory));
}

function renderProjects(){
  const keyword = searchInput.value.trim().toLowerCase();
  const filtered = projects.filter(p => {
    const searchOk = p.title.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword);
    const categoryOk = selectedCategory === 'All' || p.category === selectedCategory;
    return searchOk && categoryOk;
  });

  document.getElementById('projectGrid').innerHTML = filtered.map(p => `
    <article class="project-card">
      <img src="${p.image}" alt="${p.title}">
      <div class="project-card-body">
        <p class="project-category">${p.category}</p>
        <h2 class="project-title">${p.title}</h2>
        <p class="project-desc">${p.description}</p>
        <a class="view-btn" href="project-details.html?id=${p.id}">
          View details <i class="bi bi-arrow-right"></i>
        </a>
      </div>
    </article>
  `).join('');

  document.getElementById('emptyMessage').hidden = filtered.length !== 0;
}

function setCookie(name,value,days){
  const expires = new Date(Date.now()+days*86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name){
  const prefix = `${name}=`;
  const item = document.cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : '';
}
