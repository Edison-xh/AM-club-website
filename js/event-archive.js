const eventsDataPath = 'data/events.json';
const eventsPerPage = 12; //maximum event card per page

let upcomingEvents = [];
let filteredUpcomingEvents = [];
let currentPage = 1;

function getPageEvents() {
    const startIndex = (currentPage - 1) * eventsPerPage;

    return filteredUpcomingEvents.slice(startIndex, startIndex + eventsPerPage);
}

function getPaginationPages(totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    // A Set prevents page 1 or the last page appearing twice near either end.
    const visiblePages = [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
        .filter(page => page >= 1 && page <= totalPages)
        .sort((firstPage, secondPage) => firstPage - secondPage);
    const pages = [];
    let previousPage = 0;

    visiblePages.forEach(page => {
        if (page - previousPage > 1) {
            pages.push(`ellipsis-${previousPage}`);
        }

        pages.push(page);
        previousPage = page;
    });

    return pages;
}

function createPaginationButton(label, page, options = {}) {
    const { disabled = false, current = false, icon = false, accessibleLabel = `Page ${page}` } = options;

    return `
        <button
            class="event-pagination-button${current ? ' is-current' : ''}${icon ? ' is-icon' : ''}"
            type="button"
            data-page="${page}"
            aria-label="${accessibleLabel}"
            ${current ? 'aria-current="page"' : ''}
            ${disabled ? 'disabled' : ''}>
            ${label}
        </button>
    `;
}

function renderPagination() {
    const pagination = document.querySelector('#event-pagination');
    const totalPages = Math.ceil(filteredUpcomingEvents.length / eventsPerPage); //calculate how many pages needed

    if (totalPages <= 1) {
        pagination.hidden = true;
        return;
    }

    const pageButtons = getPaginationPages(totalPages)
        .map(page => typeof page === 'string'
            ? '<span class="event-pagination-ellipsis" aria-hidden="true">&hellip;</span>'
            : createPaginationButton(String(page), page, { current: page === currentPage }))
        .join('');

    pagination.innerHTML = `
        ${createPaginationButton('<i class="bi bi-chevron-left" aria-hidden="true"></i>', currentPage - 1, {
            disabled: currentPage === 1,
            icon: true,
            accessibleLabel: 'Previous page'
        })}
        ${pageButtons}
        ${createPaginationButton('<i class="bi bi-chevron-right" aria-hidden="true"></i>', currentPage + 1, {
            disabled: currentPage === totalPages,
            icon: true,
            accessibleLabel: 'Next page'
        })}
    `;
    pagination.hidden = false;
}

//redraws the event-card area and pagination whenever page/search/filter changes.   
function renderArchivePage() {
    const archiveList = document.querySelector('#event-archive-list');
    const summary = document.querySelector('#event-archive-summary');
    const pageEvents = getPageEvents();
    const startNumber = (currentPage - 1) * eventsPerPage + 1;
    const endNumber = startNumber + pageEvents.length - 1;

    archiveList.innerHTML = pageEvents.length > 0
        ? pageEvents.map(createEventCard).join('')
        : '<p class="event-loading-message">There are no upcoming events at the moment.</p>';
    summary.textContent = pageEvents.length > 0
        ? `Showing ${startNumber}-${endNumber} of ${filteredUpcomingEvents.length} events`
        : 'No matching events';

    renderPagination();
}

function renderArchiveFilters() {
    const filterList = document.querySelector('#event-archive-filter-list');
    const categories = ['all', ...new Set(upcomingEvents.map(event => event.category).filter(Boolean))];

    filterList.innerHTML = categories.map(category => `
        <button class="event-filter-button${category === 'all' ? ' is-active' : ''}"
            type="button" data-event-archive-filter="${escapeHtml(category)}">
            ${escapeHtml(category === 'all' ? 'All events' : category)}
        </button>
    `).join('');
}

function applyArchiveFilters() {
    const searchInput = document.querySelector('#event-archive-search');
    const searchTerm = searchInput.value.trim().toLowerCase();
    const activeFilter = document.querySelector('.event-filter-button.is-active')?.dataset.eventArchiveFilter || 'all';

    filteredUpcomingEvents = upcomingEvents.filter(event => {
        const matchesCategory = activeFilter === 'all' || event.category === activeFilter;
        const searchableText = event.title.toLowerCase();

        return matchesCategory && searchableText.includes(searchTerm);
    });
    currentPage = 1;
    renderArchivePage();
}

function setupArchiveInteractions() {
    const searchInput = document.querySelector('#event-archive-search');
    const eventsById = new Map(upcomingEvents.map(event => [String(event.id), event]));

    function handleArchiveClick(event) {
        const filterButton = event.target.closest('[data-event-archive-filter]');
        const detailsButton = event.target.closest('[data-event-details]');

        if (filterButton) {
            document.querySelectorAll('[data-event-archive-filter]').forEach(button => button.classList.remove('is-active'));
            filterButton.classList.add('is-active');
            applyArchiveFilters();
        }

        if (detailsButton) {
            const selectedEvent = eventsById.get(detailsButton.dataset.eventDetails);

            if (selectedEvent) showEventDetailsModal(selectedEvent);
        }
    }

    if (window.jQuery) {
        const $ = window.jQuery;

        $(searchInput).on('input', applyArchiveFilters);
        $(document).on('click', handleArchiveClick);
    } else {
        searchInput.addEventListener('input', applyArchiveFilters);
        document.addEventListener('click', handleArchiveClick);
    }
}

function showArchiveError() {
    document.querySelector('#event-archive-list').innerHTML =
        '<p class="event-loading-message">Upcoming events could not be loaded.</p>';
}

document.querySelector('#event-pagination').addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');

    if (!pageButton || pageButton.disabled) {
        return;
    }

    currentPage = Number(pageButton.dataset.page);
    renderArchivePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

fetch(eventsDataPath)
    .then(response => {
        if (!response.ok) {
            throw new Error('Unable to load events.json');
        }

        return response.json();
    })
    .then(events => {
        upcomingEvents = separateEvents(events).upcoming;
        filteredUpcomingEvents = upcomingEvents;
        renderArchiveFilters();
        setupArchiveInteractions();
        renderArchivePage();
    })
    .catch(error => {
        console.error(error);
        showArchiveError();
    });
