// ==================================================
// 0. Initialisation plugins
// ==================================================

function initPlugins(){
    // Lazy loading des images
    $(".lazy").lazy({
          effect: "fadeIn",
          effectTime: 2000,
          threshold: 0,
          appendScroll: $("#taxonList")
        });
    // Bootstrap tooltips
    $('[data-toggle="tooltip"]').tooltip();
}

// ==================================================
// 1. Menu filtre drowdown
// ==================================================

const selectedGroups = new Set(["all"]); // par défaut “Tous”

function buildGroupFilterMenu() {
    const groupSet = new Set(taxonsData.map(t => t.group2_inpn).filter(Boolean));
    const groupFilterList = document.getElementById("groupFilterList");

    const groupItemsHtml = [...groupSet].sort().map((group, i) => `
    <li class="px-1">
        <div class="form-check">
        <input class="form-check-input group-check" type="checkbox" id="g-${i}" data-group="${group}">
        <label class="form-check-label" for="g-${i}">${group}</label>
        </div>
    </li>
    `).join("");

    groupFilterList.innerHTML = `
    <li class="px-1 mb-1">
        <div class="form-check">
        <input class="form-check-input" type="checkbox" id="g-all" data-group="all" checked>
        <label class="form-check-label" for="g-all">Tous les taxons</label>
        </div>
    </li>
    <li><hr class="dropdown-divider"></li>
    <li class="px-1">
        <div class="form-check">
        <input class="form-check-input" type="checkbox" id="g-threat" data-group="threatened">
        <label class="form-check-label" for="g-threat">Menacés</label>
        </div>
    </li>
    <li><hr class="dropdown-divider"></li>
    ${groupItemsHtml}
    <li><hr class="dropdown-divider"></li>
    <li class="d-flex gap-2 px-1">
        <button type="button" class="btn btn-sm btn-light flex-fill" id="btn-clear">Effacer</button>
        <button type="button" class="btn btn-sm btn-primary flex-fill" id="btn-apply">Appliquer</button>
    </li>
    `;
}

function updateLabel() {
    const span = document.getElementById("currentGroupLabel");
    if (selectedGroups.has("all") || selectedGroups.size === 0) {
        span.textContent = "Tous";
        return;
    }
    const names = [...selectedGroups].filter(g => g !== "threatened");
    const includesThreat = selectedGroups.has("threatened");
    const shown = names.slice(0, 3).join(", ") + (names.length > 3 ? `, +${names.length - 3}` : "");
    if (names.length && includesThreat) {
        span.textContent = `${shown} + Menacés`;
    } else if (names.length) {
        span.textContent = shown;
    } else {
        span.textContent = "Menacés";
    }
}

function syncAllCheckbox() {
    const allCb = document.getElementById("g-all");
    // “Tous” coché si rien d’autre n’est sélectionné
    const othersSelected = [...document.querySelectorAll('#groupFilterList input[type="checkbox"]')]
        .some(cb => cb.dataset.group !== "all" && cb.checked);
    allCb.checked = !othersSelected;
    if (allCb.checked) {
        selectedGroups.clear(); selectedGroups.add("all");
    } else {
        selectedGroups.delete("all");
    }
    updateLabel();
}

function handleFilterCheckboxChange() {
    // === Gestion des clics ===
    const g = this.dataset.group;

    // 1. Si "Tous" est coché → on décoche tout le reste
    if (g === "all") {
        $('#groupFilterList input[type="checkbox"]').not(this).prop('checked', false);
    }

    // 2. Mettre à jour selectedGroups selon les cases cochées
    selectedGroups.clear();
    $('#groupFilterList input[type="checkbox"]:checked').each(function () {
        selectedGroups.add(this.dataset.group);
    });

    // 3. Synchroniser "Tous" et mettre à jour le label
    syncAllCheckbox();
}

function clearFilters() {
    $('#groupFilterList input[type="checkbox"]').prop('checked', false);
    $('#g-all').prop('checked', true);
    selectedGroups.clear(); selectedGroups.add("all");
    updateLabel();
    applyCombinedFilter();
}

// === Filtre combiné texte + groupes (union des groupes sélectionnés) ===
function applyCombinedFilter() {
  const text = $("#taxonInput").val().toLowerCase();

  // Séparer clairement la sélection
  const hasThreat = selectedGroups.has("threatened");
  const groupSelections = [...selectedGroups].filter(g => g !== "all" && g !== "threatened");

  $("#taxonList li").each(function () {
    const matchesText = $(this).text().toLowerCase().includes(text);

    // Groupe de l’élément (préférence data-attribute)
    const group = $(this).find(".d-none").text().trim();

    // Statut “menacé”
    const cdRefAttr = this.getAttribute('cdref');
    const cdRef = cdRefAttr ? Number(cdRefAttr) : null;
    const isThreatened = cdRef != null && threatenedTaxons.includes(cdRef);

    // --- LOGIQUE DEMANDÉE ---
    // 1) Union des groupes taxonomiques entre eux
    //    - si aucun groupe taxonomique sélectionné => “tous les groupes” (pour permettre Menacé seul)
    const inSelectedGroups = groupSelections.length === 0 || groupSelections.includes(group);

    // 2) Si "Menacé" est coché, on impose l’INTERSECTION avec le statut menacé
    //    => (groupe ∈ sélection) ET (menacé si demandé)
    const matchesGroup = inSelectedGroups && (!hasThreat || isThreatened);

    this.style.setProperty("display", (matchesText && matchesGroup) ? "flex" : "none", "important");
  });
}

// ==================================================
// 2. Export csv
// ==================================================

function exportCsv(){
    if (!Array.isArray(taxonsData)) {
        alert("Aucune donnée disponible.");
        return;
    }

    const visibleCdRefs = Array.from(document.querySelectorAll("#taxonList li"))
        .filter(li => window.getComputedStyle(li).display !== "none")
        .map(li => li.getAttribute("cdref"))
        .filter(cdref => cdref !== null);

    if (visibleCdRefs.length === 0) {
        alert("Aucun taxon à exporter.");
        return;
    }

    // Colonnes du CSV
    const rows = [[
        "CdRef", "Groupe taxonomique", "Nom vernaculaire", "Nom scientifique",
        "Nombre d'occurrences", "Nombre d'observateurs",  "Dernière observation", 
        "Menacé", "Patrimonial", "Protection stricte"
    ]];

    // Filtrer les taxons visibles dans taxonsData
    taxonsData.forEach(taxon => {
        if (!visibleCdRefs.includes(String(taxon.cd_ref))) return;

        const taxonomicGroup = taxon.group2_inpn || "-";
        const cdRef = taxon.cd_ref || "-";
        const nomVern = (typeof taxon.nom_vern === "string" && taxon.nom_vern) 
        ? taxon.nom_vern.split(',')[0].trim() 
        : "-";
        const nomSci = taxon.lb_nom || "-";
        const nbObs = taxon.nb_obs || "0";
        const nbObservers = taxon.nb_observers || "0";
        const lastYear = taxon.last_obs || "-";
        const patrimonial = taxon.patrimonial || "-";
        const strictProtection = taxon.protection_stricte || "-";

        // Ajout de la colonne "Menacé" en tant que true/false
        const isThreatened = threatenedTaxons.includes(Number(taxon.cd_ref));  

        rows.push([cdRef, taxonomicGroup, nomVern, nomSci, nbObs, 
        nbObservers, lastYear, isThreatened, patrimonial, strictProtection]);
    });

    const fileName = document.getElementById("exportCsvBtn").dataset.filename;
    const csvContent = rows.map(row => row.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportPdf() {
    if (!Array.isArray(taxonsData)) {
        alert("Aucune donnée disponible.");
        return;
    }

    const visibleCdRefs = Array.from(document.querySelectorAll("#taxonList li"))
        .filter(li => window.getComputedStyle(li).display !== "none")
        .map(li => li.getAttribute("cdRef"))
        .filter(cdref => cdref !== null);

    if (visibleCdRefs.length === 0) {
        alert("Aucun taxon à exporter.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });

    const fileName = document.getElementById("exportPdfBtn").dataset.filename;
    const title = fileName.replace(/\.pdf$/i, "");
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14.5);
    doc.text(title, pageWidth / 2, 15, { align: "center" });

    const headers = [
        [
        "Groupe taxonomique",
        "Nom vernaculaire",
        "Nom scientifique",
        "Nombre d’occurrences",
        "Nombre d'observateurs",
        "Dernière observation",
        "Menacé",
        "Patrimonial",
        "Protection stricte"
        ]
    ];

    const data = taxonsData
        .filter(taxon => visibleCdRefs.includes(String(taxon.cd_ref)))
        .map(taxon => {
        const isThreatened = threatenedTaxons.includes(Number(taxon.cd_ref)) ? true : false;
        return [
            taxon.group2_inpn || "-",
            (typeof taxon.nom_vern === "string" && taxon.nom_vern) 
            ? taxon.nom_vern.split(',')[0].trim() 
            : "-",
            taxon.lb_nom || "-",
            taxon.nb_obs || "0",
            taxon.nb_observers || "0",
            taxon.last_obs || "-",
            isThreatened,
            taxon.patrimonial || "-",
            taxon.protection_stricte || "-"
        ]});

    doc.autoTable({
        startY: 25,
        head: headers,
        body: data,
        styles: { fontSize: 9, cellPadding: 1 },
        headStyles: { fillColor: [40, 60, 100], halign: 'center' },
        margin: { top: 20 },
        columnStyles: {
            3: { halign: 'center' }, // Nombre d'occurrences
            4: { halign: 'center' }, // Nombre d'observateurs
            5: { halign: 'center' }  // Dernière observation
        },
        didParseCell: function (data) {
        const threatenedColumnIndex = 6;
        if (
            data.section === 'body' &&
            data.row.raw[threatenedColumnIndex] ===  true
        ) {
            data.cell.styles.fillColor = [255, 200, 200];
        }
        }
    });

    doc.save(fileName);
}

// ==================================================
// 4. INITIALISATION AU CHARGEMENT
// ==================================================

$(document).ready(function () {
    initPlugins();
    buildGroupFilterMenu();
    updateLabel();

    // Écouteurs filtres
    $('#groupFilterList').on('change', 'input[type="checkbox"]', handleFilterCheckboxChange);
    $('#btn-clear').on('click', clearFilters);
    $('#btn-apply').on('click', applyCombinedFilter);
    $('#groupFilterList').on('click', e => e.stopPropagation()); // Empêche fermeture menu
    $("#taxonInput").on("keyup", applyCombinedFilter);

    // Écouteurs export
    $("#exportCsvBtn").on("click", exportCsv);
    $("#exportPdfBtn").on("click", exportPdf);
});