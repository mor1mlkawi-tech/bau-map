
let buildingsData = { buildings: [], metadata: {} };

const state = {
  selectedBuildingId: null,
  selectedFloorNumber: null,
  currentResults: [],
  currentSearchQuery: ''
};

const mapPositions = {
 'bld-001': { x: 15.3, y: 50.1 }, // هندسة
  'bld-002': { x: 75.8, y: 35.5 }, // أعمال
  'bld-003': { x: 44.8, y: 27.9 },  // آداب / علوم
  'bld-004': { x: 60.2, y: 40.0 }, // مكتبة
  'bld-005': { x: 33.8, y: 70.0 }, // IT
  'bld-006': { x: 52.4, y: 18.2 },  // إدارة
  'bld-007': { x: 40, y: 60 }
};
const manualRoutes = {

  "bld-001-bld-004": [
    { x: 15.3, y: 50.1 },
    { x: 23, y: 65 },
       { x: 29, y: 70 },
    { x: 40, y: 67 },
    { x: 50, y: 54 },
    { x: 63, y: 47 },
    { x: 60.2, y: 40.0 }
  ],

  "bld-001-bld-002": [
    { x: 15.3, y: 50.1 },
    { x: 23, y: 65 },
       { x: 29, y: 70 },
    { x: 40, y: 67 },
    { x: 50, y: 54 },
    { x: 65, y: 48 },
       { x: 65, y: 48 },
    { x: 75.8, y: 35.5 }
  ],

  "bld-004-bld-006": [
    { x: 60.2, y: 40.0 },
    { x: 60.2, y: 33 },
    { x: 58, y: 27 },
    { x: 55, y: 22 },
    { x: 52.4, y: 18.2 }
  ],

  "bld-005-bld-004": [
    { x: 33.8, y: 70.0 },
    { x: 33.8, y: 60 },
    { x: 42, y: 54 },
    { x: 51, y: 47 },
    { x: 60.2, y: 40.0 }
  ],

  "bld-002-bld-006": [
    { x: 75.8, y: 35.5 },
    { x: 70, y: 28 },
    { x: 63, y: 24 },
    { x: 57, y: 20 },
    { x: 52.4, y: 18.2 }
  ]
};
const SYNONYMS = {
  lab: 'مختبر', laboratory: 'مختبر', office: 'مكتب', class: 'قاعة', classroom: 'قاعة',
  library: 'مكتبة', admin: 'إدارة', engineering: 'هندسة', business: 'أعمال', it: 'it'
};

function loadFromStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadBuildingsData() {
  try {
    const response = await fetch('./buildings.json');
    if (!response.ok) throw new Error('Failed to load JSON');
    buildingsData = await response.json();
    return buildingsData;
  } catch (error) {
    if (window.__BUILDINGS_FALLBACK__) {
      buildingsData = window.__BUILDINGS_FALLBACK__;
      return buildingsData;
    }
    return null;
  }
}

function getAllRooms() {
  const rooms = [];
  buildingsData.buildings.forEach(building => {
    building.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        rooms.push({
          ...room,
          floor: floor.floorNumber,
          floorName: floor.floorName,
          buildingId: building.id,
          buildingName: building.name,
          buildingData: building
        });
      });
    });
  });
  return rooms;
}

function getBuildingById(buildingId) {
  return buildingsData.buildings.find(building => building.id === buildingId) || null;
}

function normalizeSearchTerm(query) {
  const trimmed = query.trim().toLowerCase();
  return SYNONYMS[trimmed] || trimmed;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\\\\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query) return text;
  try {
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return String(text).replace(regex, '<mark>$1</mark>');
  } catch {
    return text;
  }
}

function searchAll(query) {
  const normalizedSearch = normalizeSearchTerm(query);
  if (!normalizedSearch) return [];

  const results = [];

  buildingsData.buildings.forEach(building => {
    const buildingMatches =
      building.name.toLowerCase().includes(normalizedSearch) ||
      building.nameEn.toLowerCase().includes(normalizedSearch) ||
      building.shortName.toLowerCase().includes(normalizedSearch);

    if (buildingMatches) {
      results.push({
        resultType: 'building',
        id: building.id,
        name: building.name,
        nameEn: building.nameEn,
        shortName: building.shortName,
        buildingData: building
      });
    }

    building.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        const roomMatches =
          room.name.toLowerCase().includes(normalizedSearch) ||
          room.number.toLowerCase().includes(normalizedSearch) ||
          room.type.toLowerCase().includes(normalizedSearch);

        if (roomMatches) {
          results.push({
            resultType: 'room',
            id: room.id,
            number: room.number,
            name: room.name,
            roomType: room.type,
            capacity: room.capacity,
            floor: floor.floorNumber,
            floorName: floor.floorName,
            buildingId: building.id,
            buildingName: building.name,
            buildingData: building
          });
        }
      });
    });
  });

  return results;
}

function getRoomTypes() {
  return [...new Set(getAllRooms().map(room => room.type))];
}

function getStatistics() {
  const rooms = getAllRooms();
  const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
  const totalFloors = buildingsData.buildings.reduce((sum, building) => sum + building.floors.length, 0);
  return {
    totalBuildings: buildingsData.buildings.length,
    totalFloors,
    totalRooms: rooms.length,
    totalCapacity
  };
}

function sortItems(items, sortValue) {
  const cloned = [...items];
  if (sortValue === 'capacity') return cloned.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  if (sortValue === 'room-number') return cloned.sort((a, b) => String(a.number || '').localeCompare(String(b.number || ''), 'ar'));
  return cloned.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
}

function filterRoomsByType(items, typeValue) {
  if (!typeValue) return items;
  return items.filter(item => item.resultType === 'building' || item.roomType === typeValue || item.type === typeValue);
}

function createMapPoints() {
  const layer = document.getElementById('pointsLayer');
  layer.innerHTML = '';

  buildingsData.buildings.forEach(building => {
    const pos = mapPositions[building.id];
    if (!pos) return;

    const point = document.createElement('button');
    point.type = 'button';
    point.className = 'map-point';
    point.dataset.id = building.id;
    point.dataset.short = building.shortName;
    point.style.left = `${pos.x}%`;
    point.style.top = `${pos.y}%`;
    point.title = building.name;
    point.addEventListener('click', () => selectBuilding(building.id));
    layer.appendChild(point);
  });
}

function updateBuildingHighlight(buildingId) {
  document.querySelectorAll('.map-point').forEach(node => {
    const isActive = node.dataset.id === buildingId;
    node.classList.toggle('active', isActive);
    node.classList.toggle('dimmed', !!buildingId && !isActive);
  });

  const hint = document.getElementById('selectedHint');
  hint.textContent = buildingId ? `المبنى المحدد: ${getBuildingById(buildingId)?.shortName || '---'}` : 'لا يوجد مبنى محدد الآن';
}

function createRoomRow(room) {
  return `
    <div class="room-item">
      <div>
        <strong>(${room.number}) ${highlightText(room.name, state.currentSearchQuery)}</strong>
        <small>${room.floorName} — سعة: ${room.capacity}</small>
      </div>
      <span class="chip">${room.type || room.roomType}</span>
    </div>
  `;
}

function renderFloorTabs(building) {
  return `
    <div class="floors-tabs">
      ${building.floors.map(floor => `
        <button class="tab ${state.selectedFloorNumber === floor.floorNumber ? 'active' : ''}" onclick="changeFloor('${building.id}', ${floor.floorNumber})">
          ${floor.floorName}
        </button>
      `).join('')}
    </div>
  `;
}

function getRoomCount(building) {
  return building.floors.reduce((sum, floor) => sum + floor.rooms.length, 0);
}

function renderBuildingInfo(building) {
  if (!building) return;
  const infoBox = document.getElementById('infoBox');
  if (state.selectedFloorNumber === null) {
    state.selectedFloorNumber = building.floors[0]?.floorNumber ?? null;
  }

  const selectedFloor = building.floors.find(floor => floor.floorNumber === state.selectedFloorNumber) || building.floors[0];
  const rooms = selectedFloor ? selectedFloor.rooms.map(room => ({ ...room, floorName: selectedFloor.floorName })) : [];
  infoBox.innerHTML = `
    <div class="info-header">
      <div>
        <h2>${building.name}</h2>
        <p>${building.nameEn}</p>
      </div>
      <span class="badge">${building.floors.length} طابق / ${getRoomCount(building)} قاعة</span>
    </div>
    <div class="box-title">
      <h3>عرض الطوابق</h3>
    </div>

    ${renderFloorTabs(building)}

    <div class="rooms-list">
      ${rooms.map(createRoomRow).join('')}
    </div>

    <div class="services">
      <strong>🛎️ الخدمات المتاحة</strong>
      <div class="service-list">
        ${building.services.map(service => `<span>${service}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderSearchResults(results) {
  const infoBox = document.getElementById('infoBox');

  if (!results.length) {
    infoBox.innerHTML = `<div class="empty-state">لا توجد نتائج مطابقة. جرّب كلمة أخرى أو اختر مبنى من الخريطة.</div>`;
    return;
  }

  const html = results.map(item => {
    if (item.resultType === 'building') {
      return `
        <div class="room-item" onclick="selectBuilding('${item.id}')" style="cursor:pointer">
          <div>
            <strong>${highlightText(item.name, state.currentSearchQuery)}</strong>
            <small>${item.nameEn}</small>
          </div>
          <span class="chip">مبنى</span>
        </div>
      `;
    }

    return `
      <div class="room-item" onclick="selectBuilding('${item.buildingId}', ${item.floor})" style="cursor:pointer">
        <div>
          <strong>(${item.number}) ${highlightText(item.name, state.currentSearchQuery)}</strong>
          <small>${item.buildingName} — ${item.floorName} — سعة: ${item.capacity}</small>
        </div>
        <span class="chip">${item.roomType}</span>
      </div>
    `;
  }).join('');

  infoBox.innerHTML = `
    <div class="info-header">
      <div>
        <h2>نتائج البحث</h2>
        <p>عدد النتائج: ${results.length}</p>
      </div>
      <span class="badge">بحث ذكي</span>
    </div>
    <div class="rooms-list">${html}</div>
  `;
}
function populateTypeFilter() {
  const select = document.getElementById('typeFilter');
  getRoomTypes().forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

function populateRouteStart() {
  const select = document.getElementById('routeFromSelect');
  buildingsData.buildings.forEach(building => {
    const option = document.createElement('option');
    option.value = building.id;
    option.textContent = `ابدأ من: ${building.shortName}`;
    select.appendChild(option);
  });
}

function performSearch() {
  const searchValue = document.getElementById('searchInput').value.trim();
  const typeValue = document.getElementById('typeFilter').value;
  const sortValue = document.getElementById('sortSelect').value;
  state.currentSearchQuery = normalizeSearchTerm(searchValue);

  if (!searchValue) {
    if (state.selectedBuildingId) {
      renderBuildingInfo(getBuildingById(state.selectedBuildingId));
      return;
    }
    document.getElementById('infoBox').innerHTML = `
      <div class="empty-state">اكتب كلمة للبحث أو اضغط على نقطة فوق الخريطة.</div>
      <div class="tip">مثال: مختبر، مكتبة، A01، هندسة، office</div>
    `;
    updateBuildingHighlight(null);
    clearRouteVisuals();
    return;
  }

  let results = searchAll(searchValue);
  results = filterRoomsByType(results, typeValue);
  results = sortItems(results, sortValue);
  state.currentResults = results;
  renderSearchResults(results);
  updateBuildingHighlight(null);
}

function selectBuilding(buildingId, floorNumber = null) {
  state.selectedBuildingId = buildingId;
  const building = getBuildingById(buildingId);
  if (!building) return;

  state.selectedFloorNumber = floorNumber ?? building.floors[0]?.floorNumber ?? null;
  renderBuildingInfo(building);
  updateBuildingHighlight(buildingId);
  renderRouteIfPossible(buildingId);
}

function changeFloor(buildingId, floorNumber) {
  state.selectedBuildingId = buildingId;
  state.selectedFloorNumber = floorNumber;
  renderBuildingInfo(getBuildingById(buildingId));
}

function renderRouteIfPossible(targetBuildingId) {
  const fromId = document.getElementById('routeFromSelect').value;
  const summary = document.getElementById('routeSummary');
  if (!fromId || fromId === targetBuildingId) {
    clearRouteVisuals();
    if (summary) {
      summary.textContent = fromId === targetBuildingId
        ? 'أنت بالفعل في نفس المبنى. اختر مبنى آخر كوجهة.'
        : 'اختر نقطة بداية من الأعلى ثم اضغط على مبنى لعرض مسار تقريبي إليه.';
    }
    return;
  }

  const fromPoint = mapPositions[fromId];
  const toPoint = mapPositions[targetBuildingId];
  const fromBuilding = getBuildingById(fromId);
  const toBuilding = getBuildingById(targetBuildingId);
  if (!fromPoint || !toPoint || !fromBuilding || !toBuilding) return;

  const points = buildRoutePoints(fromId, targetBuildingId);
  const routeLine = document.getElementById('routeLine');
  const routeStart = document.getElementById('routeStart');
  const routeEnd = document.getElementById('routeEnd');

  routeLine.setAttribute('points', points.map(point => `${point.x},${point.y}`).join(' '));
  routeLine.classList.add('visible');

  routeStart.setAttribute('cx', fromPoint.x);
  routeStart.setAttribute('cy', fromPoint.y);
  routeEnd.setAttribute('cx', toPoint.x);
  routeEnd.setAttribute('cy', toPoint.y);
  routeStart.classList.add('visible');
  routeEnd.classList.add('visible');

  if (summary) summary.textContent = `المسار التقريبي: من ${fromBuilding.name} إلى ${toBuilding.name}.`;
}

function buildRoutePoints(startId, endId) {
  const routeKey = `${startId}-${endId}`;
  const reverseKey = `${endId}-${startId}`;

  if (manualRoutes[routeKey]) {
    return manualRoutes[routeKey];
  }

  if (manualRoutes[reverseKey]) {
    return [...manualRoutes[reverseKey]].reverse();
  }

  return [
    mapPositions[startId],
    mapPositions[endId]
  ];
}

function clearRouteVisuals() {
  const routeLine = document.getElementById('routeLine');
  const routeStart = document.getElementById('routeStart');
  const routeEnd = document.getElementById('routeEnd');
  if (!routeLine || !routeStart || !routeEnd) return;
  routeLine.classList.remove('visible');
  routeStart.classList.remove('visible');
  routeEnd.classList.remove('visible');
  routeLine.setAttribute('points', '');
}

function clearRoute() {
  document.getElementById('routeFromSelect').value = '';
  clearRouteVisuals();
  const summary = document.getElementById('routeSummary');
  if (summary) summary.textContent = 'اختر نقطة بداية من الأعلى ثم اضغط على مبنى لعرض مسار تقريبي إليه.';
}

function applySavedTheme() {
  const savedTheme = loadFromStorage('graduationMapTheme', 'light');
  document.body.classList.toggle('dark', savedTheme === 'dark');
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  saveToStorage('graduationMapTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

window.selectBuilding = selectBuilding;
window.changeFloor = changeFloor;

async function initializeApp() {
  applySavedTheme();
  const data = await loadBuildingsData();
  const infoBox = document.getElementById('infoBox');
  if (!data) {
    infoBox.innerHTML = '<div class="empty-state">حدث خطأ في تحميل البيانات.</div>';
    return;
  }

  createMapPoints();
  populateTypeFilter();
  populateRouteStart();

  document.getElementById('searchButton').addEventListener('click', performSearch);
  document.getElementById('searchInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') performSearch();
  });
  document.getElementById('typeFilter').addEventListener('change', performSearch);
  document.getElementById('sortSelect').addEventListener('change', performSearch);
  document.getElementById('routeFromSelect').addEventListener('change', () => {
    if (state.selectedBuildingId) renderRouteIfPossible(state.selectedBuildingId);
  });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('clearRouteButton').addEventListener('click', clearRoute);

  selectBuilding('bld-001');
}

document.addEventListener('DOMContentLoaded', initializeApp);
