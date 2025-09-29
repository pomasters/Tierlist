import { SYNCPAIRS } from "https://pomasters.github.io/SyncPairsTracker/js/syncpairs.js";
import { EGGS } from "https://pomasters.github.io/SyncPairsTracker/js/eggs.js";
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/+esm";
import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm";



const COLORS = ["#FF7F7F","#FFBF7F","#FFDF7F","#FFFF7F","#7FFF7F","#7FFFFF","#7FBFFF","#7F7FFF","#FF7FFF","#BF7FBF","#3B3B3B","#858585","#CFCFCF","#F7F7F7"];

const POOL = document.getElementById("pool");

const TIERLIST = document.getElementById("tierlist");

const DEFAULT_TIERS = [
	{ id: "tierS", name: "S", color: "#FF7F7F" },
	{ id: "tierA", name: "A", color: "#FFBF7F" },
	{ id: "tierB", name: "B", color: "#FFDF7F" },
	{ id: "tierC", name: "C", color: "#FFFF7F" },
	{ id: "tierD", name: "D", color: "#7FFF7F" },
];

const DEFAULT_IMAGES = { tierS: [], tierA: [], tierB: [], tierC: [], tierD: [] }

const DEFAULT_TIERLIST = { tiers: DEFAULT_TIERS, images: DEFAULT_IMAGES }

let TIERS = DEFAULT_TIERS.slice()

let IMAGES_DATA = {};



function generatePairsData(pairs) {
	for(const pair of pairs) {
		if(!pair.images?.length) continue;

		const trainer = pair.trainerName === "N" ? "Natural" : (pair.trainerName || "");
		const pokemon = pair.pokemonName || "";
		const type = pair.pokemonType || "";
		const role = pair.syncPairRole || "";
		const region = pair.syncPairRegion || "";
		const releaseDate = pair.releaseDate || "";

		const acquisition = (pair.syncPairAcquisition || "")
							.toLowerCase()
							.replaceAll(/ \/ general pool| scout| exchange|: pml arc/g, "")
							.replaceAll("é", "e")
							.replaceAll(" ", "");

		for(const imgPath of pair.images) {
			const fileName = imgPath.split("/").at(-1);
			const rarity = fileName.split("_").at(-1).replace(".png", "star");

			IMAGES_DATA[fileName] = [trainer, pokemon, type, role, region, rarity, releaseDate, acquisition];
		}
	}
}



function loadIcons(images) {
	POOL.innerHTML = "";

	const existingTL = new Set([...document.querySelectorAll(".tier .tier-images img")].map(img => decodeURIComponent(img.src.split("/").at(-1))));

	let html = "";

	for(const pair of images) {
		if(!pair.images?.length) continue;
		if(pair.trainerName === "Player" && pair.pokemonName === "Alcremie" && pair.releaseDate === "2025-02-11") continue;

		for(const imgPath of pair.images) {
			const fileName = imgPath.split("/").at(-1);

			if (existingTL.has(fileName)) continue;

			const tags = (IMAGES_DATA[fileName] || []).join(" ").toLowerCase();

			html += `<img src="https://pomasters.github.io/SyncPairsTracker/icons/${fileName}" class="icon" data-tags="${tags}">`;
		}
	}

	POOL.innerHTML = html;

	new Sortable(POOL, { group: "shared", animation: 0, ghostClass: "sortable-ghost", onEnd: saveToLocalStorage	});
}



function search() {
	const query = document.getElementById("searchBar").value.toLowerCase().trim();
	const searchInTL = document.getElementById("searchInTierlist").checked;

	let allIcons = [...POOL.getElementsByClassName("icon")];

	if(searchInTL) {
		allIcons = Array.from(document.getElementsByClassName("icon"));
	} else {
		[...TIERLIST.getElementsByClassName("icon")].forEach(icon => { icon.style.display = "" })
	}

	if(query === "") {
		allIcons.forEach(icon => icon.style.display = "");
		return;
	}

	const groups = query.split(/\s*,\s*/).filter(g => g.length > 0);

	allIcons.forEach(icon => {
		const fullText = icon.dataset.tags;

		const matchesGroup = groups.some(group => {
			const words = group.split(/\s+/);

			return words.every(word => {
				if(word.startsWith("-")) {
					const negWord = word.slice(1);
					return !fullText.includes(negWord);
				} else {
					return fullText.includes(word);
				}
			});
		});

		icon.style.display = matchesGroup ? "" : "none";
	});
}

document.getElementById("searchBar").addEventListener("input", search);
document.getElementById("searchInTierlist").addEventListener("input", search);



function renderTiers() {

	const currentImages = {};

	document.querySelectorAll(".tier").forEach(tierDiv => {
		const id = tierDiv.dataset.id;
		currentImages[id] = [...tierDiv.querySelector(".tier-images").children];
	});

	TIERLIST.innerHTML = "";

	TIERS.forEach((tier,index) => {

		const div = document.createElement("div");
		div.className = "tier";
		div.dataset.id = tier.id;

		const title = document.createElement("div");
		title.className = "tier-title";
		title.textContent = tier.name;
		title.style.background = tier.color;
		title.contentEditable = true;
		title.spellcheck = false;
		title.addEventListener("paste", (e) => {
			e.preventDefault();
			const text = e.clipboardData.getData("text/plain");
			document.execCommand("insertText", false, text);
		});
		title.addEventListener("input", () => renameTier(tier.id, title.innerText));
		title.addEventListener("input", saveToLocalStorage);

		const images = document.createElement("div");
		images.className = "tier-images";
		if(currentImages[tier.id]) currentImages[tier.id].forEach(img => images.appendChild(img));

		const options = document.createElement("div");
		options.className = "tier-options";
		options.setAttribute("data-html2canvas-ignore", "true");
		options.innerHTML = `
			<button class="bi bi-chevron-up"></button>
				<button class="bi bi-arrow-bar-up"></button>
				<div>
					<i class="bi bi-palette"></i>
					<select>
						${COLORS.map(c => `<option value="${c}" ${ c==tier.color ? "selected" : ""} style="background:${c};color:${c}">${c}</option>`).join("")}
					</select>
				</div>
				<button class="bi bi-trash3"></button>
				<button class="bi bi-chevron-down"></button>
			<button class="bi bi-arrow-bar-down"></button>`;

			const [btnUp, btnAddAbove, btnPalette, btnTrash, btnDown, btnAddBelow] = options.children;

			btnUp.addEventListener("click", () => moveTier(tier.id, -1));
			btnAddAbove.addEventListener("click", () => addTierAbove(tier.id));
			btnPalette.querySelector("select").addEventListener("change", e => recolorTier(tier.id, e.target));
			btnTrash.addEventListener("click", () => removeTier(tier.id));
			btnDown.addEventListener("click", () => moveTier(tier.id, 1));
			btnAddBelow.addEventListener("click", () => addTierBelow(tier.id));

			div.appendChild(title);
			div.appendChild(images);
			div.appendChild(options);

			TIERLIST.appendChild(div);

			new Sortable(images, { group:"shared", animation:0, ghostClass:"sortable-ghost", onEnd:saveToLocalStorage });
		});

	saveToLocalStorage()
}

function createTier(name="New", color="#cfcfcf") {
	function getRandId() { return Date.now() +""+ Math.floor(Math.random() * 100); }
	return { id: getRandId(), name, color };
}

function renameTier(id, name) {
	const t = TIERS.find(t => t.id === id);
	if(t) t.name = name;
}

function recolorTier(id, colorSelector) {
	const t = TIERS.find(t => t.id === id);
	if(t) t.color = colorSelector.value;

	renderTiers();
}

function removeTier(id) {
	if(confirm("Do you really want to remove this tier?")) {
		if(TIERS.length == 1) { alert("You need at least 1 tier!"); return; }

		const row = document.querySelector(`[data-id="${id}"] .tier-images`);
		[...row.children].forEach(img => POOL.appendChild(img));
		TIERS = TIERS.filter(t => t.id !== id);

		renderTiers();
	}
}

function addTierAbove(id) {
	const i = TIERS.findIndex(t => t.id === id);
	if(i < 0) return;
	TIERS.splice(i, 0, createTier());

	renderTiers();
}

function addTierBelow(id) {
	const i = TIERS.findIndex(t => t.id === id);
	if(i < 0) return;
	TIERS.splice(i + 1, 0, createTier());

	renderTiers();
}

function moveTier(id, d) {
	const i = TIERS.findIndex(t => t.id === id), ni = i + d;
	if(ni >= 0 && ni < TIERS.length) {
		const [m] = TIERS.splice(i, 1);
		TIERS.splice(ni, 0, m);
		renderTiers();
	}
}


document.getElementById("pinImagelist").addEventListener("click", () => {
	document.getElementById("imagelist").classList.toggle("pinned");
	localStorage.setItem("tierListImagePinned", document.getElementById("pinImagelist").checked);
});


document.getElementById("capture-btn").addEventListener("click", () => {
	html2canvas(TIERLIST, {scale:2,width:Math.floor(1200),windowWidth:1200,windowHeight:800,scrollX:0,scrollY:0}).then(canvas => {
		document.getElementById("modal").classList.remove("hide");
		document.getElementById("screenshot").classList.remove("hide");
		document.getElementById("screenshot").innerHTML = "";
		document.getElementById("screenshot").appendChild(canvas)
	});
});


document.getElementById("close-btn").addEventListener("click", () => {
	document.getElementById("modal").classList.add("hide");
	document.getElementById("screenshot").classList.add("hide");
});



function exportState() {
	const state = {
		tiers: TIERS.map(tier => ({ id: tier.id, name: tier.name, color: tier.color })),
		images: {}
	};

	document.querySelectorAll(".tier").forEach(tierImages => {
		const id = tierImages.dataset.id;
		state.images[id] = [...tierImages.querySelectorAll(".tier-images img")].map(img => img.src.split("/").pop());
	});

	return state;
}

function saveToLocalStorage() {
	localStorage.setItem("tierlistState", JSON.stringify(exportState()));
	console.log("Tierlist state saved");
}

document.getElementById("export-btn").addEventListener("click", () => {
	const jsonStr = JSON.stringify(exportState(), null, "\t");
	const blob = new Blob([jsonStr], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = "pomasters_tierlist.json";
	a.click();

	URL.revokeObjectURL(url);
});


function importState(state) {

	if(state) {
		TIERS = state.tiers;
		renderTiers();

		for(const [id, imgs] of Object.entries(state.images)) {
			let tierImages = document.querySelector(`.tier[data-id="${id}"] .tier-images`);
			tierImages.innerHTML = "";

			imgs.forEach(fileName => {
				const img = document.createElement("img");
				img.src = "https://pomasters.github.io/SyncPairsTracker/icons/" + fileName;
				img.className = "icon";
				img.dataset.tags = (IMAGES_DATA[decodeURIComponent(fileName)] || []).join(" ").toLowerCase();
				tierImages.appendChild(img);
			});
		}

	} else {
		renderTiers();
	}

	loadIcons(SYNCPAIRS);

	saveToLocalStorage();
}

function readLocalStorage() {
	const saved = localStorage.getItem("tierlistState");
	if(!saved) return null;

	if(localStorage.getItem("tierListImagePinned") === "true") {
		document.getElementById("pinImagelist").checked = true;
		document.getElementById("imagelist").classList.add("pinned");
	}

	try {
		return JSON.parse(saved);

	} catch(e) {
		console.error("Error ", e);
		return null;
	}
}

document.getElementById("import-btn").addEventListener("click", () => {
	document.getElementById("import-input").click();
});

document.getElementById("import-input").addEventListener("change", (event) => {
	const file = event.target.files[0];
	if(!file) return;

	const reader = new FileReader();

	reader.onload = function(e) {
		try {
			const jsonData = JSON.parse(e.target.result);
			importState(jsonData);

		} catch(e) {
			console.error("Error with the imported file ", e);
		}
	};

	reader.readAsText(file);
});


document.getElementById("reset-btn").addEventListener("click", () => {
	if(confirm("Do you really want to reset the tier list?")) {
		importState(DEFAULT_TIERLIST)
	}
});



generatePairsData(SYNCPAIRS);
importState(readLocalStorage());