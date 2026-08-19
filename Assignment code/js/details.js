
const projectTitle = document.getElementById('projectTitle');
const projectMeta = document.getElementById('projectMeta');
const projectImage = document.getElementById('projectImage');
const projectCreator = document.getElementById('projectCreator');
const projectSoftware = document.getElementById('projectSoftware');
const projectCategory = document.getElementById('projectCategory');
const projectCredits = document.getElementById('projectCredits');
const projectDescription = document.getElementById('projectDescription');
const projectProcess = document.getElementById('projectProcess');
const saveProject = document.getElementById('saveProject');
const visitCreator = document.getElementById('visitCreator');
const relatedList = document.getElementById('relatedList');
const toastBox = document.getElementById('toastBox');

fetch('data/projects.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Unable to load projects.json');
    }

    return response.json();
  })
  .then(data => {
    const projects = data;
    const idParameter =
    new URLSearchParams(location.search).get('id');

    const id = Number(idParameter);

    const project = projects.find(
        project => project.id === id
    );

    if (!idParameter || !Number.isInteger(id) || !project) {
        showProjectNotFound();
        return;
    }

    function showProjectNotFound() {
      document.title ='Project Not Found | Animation & Multimedia Club';

      projectTitle.textContent = 'Project not found';

      projectMeta.textContent ='This project does not exist. Please return to the project gallery.';

      document.querySelector('.details-top').style.display = 'none';
      document.querySelector('.details-bottom').style.display = 'none';
    }
    renderProject(project, projects);
  })
  .catch(error => {
    console.error(error);
    projectTitle.textContent = 'Project could not be loaded.';
    projectMeta.textContent = 'Please return to the project gallery and try again.';
  });

function renderProject(project, projects){
  document.title = `${project.title} | Animation & Multimedia Club`;
  projectTitle.textContent = project.title;
  projectMeta.textContent = `${project.category} • ${project.creator} • ${project.year}`;
  projectImage.src = project.image;
  projectImage.alt = project.title;
  projectCreator.textContent = project.creator;
  projectSoftware.textContent = project.software;
  projectCategory.textContent = project.category;
  projectCredits.textContent = project.credits;
  projectDescription.textContent = project.description;
  projectProcess.textContent = project.process;

  sessionStorage.setItem('lastViewedProject', project.title);

  let saved = JSON.parse(localStorage.getItem('savedProjects') || '[]');

  function updateSave(){
    const isSaved = saved.includes(project.title);
    saveProject.innerHTML = isSaved
      ? '<i class="bi bi-bookmark-check-fill"></i> Saved'
      : '<i class="bi bi-bookmark"></i> Save project';
  }

  saveProject.addEventListener('click', () => {
    if(saved.includes(project.title)){
      saved = saved.filter(x => x !== project.title);
      showToast('Project removed from saved projects.');
    } else {
      saved.push(project.title);
      showToast('Project saved on this browser.');
    }
    localStorage.setItem('savedProjects', JSON.stringify(saved));
    updateSave();
  });

  visitCreator.addEventListener('click', () => showToast(`Creator: ${project.creator}`));
  updateSave();

  let related = projects.filter(p => p.id !== project.id && p.category === project.category);
  if(related.length < 2){
    related = related.concat(projects.filter(p => p.id !== project.id && !related.some(r => r.id === p.id)));
  }

  relatedList.innerHTML = related.slice(0,2).map(p => `
    <a class="related-card" href="project-details.html?id=${p.id}">
      <img src="${p.image}" alt="${p.title}">
      <div>
        <h3>${p.title}</h3>
        <p>${p.category}</p>
      </div>
      <i class="bi bi-chevron-right"></i>
    </a>
  `).join('');
}

function showToast(message){
  toastBox.textContent = message;
  toastBox.style.display = 'block';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toastBox.style.display='none', 1800);
}
