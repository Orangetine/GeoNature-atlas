$(".lazy").lazy({
          effect: "fadeIn",
          effectTime: 2000,
          threshold: 0,
          appendScroll: $("#taxonList")
        });
$('[data-toggle="tooltip"]').tooltip();
// 1. Extraire les groupes uniques depuis taxonsData
const groupSet = new Set(taxonsData.map(t => t.group2_inpn).filter(Boolean));

// 2. Créer dynamiquement le menu
const groupFilterList = document.getElementById("groupFilterList");
groupFilterList.innerHTML = `
  <li><a class="dropdown-item" href="#" data-group="all">Tous les groupes</a></li>
  <li><a class="dropdown-item" href="#" data-group="threatened">Menacé</a></li>
  ${[...groupSet].sort().map(group =>
    `<li><a class="dropdown-item" href="#" data-group="${group}">${group}</a></li>`
  ).join("")}
`;

// 3. Gérer le filtre
let selectedGroup = "all";

function applyCombinedFilter() {
  const text = $("#taxonInput").val().toLowerCase();

  $("#taxonList li").each(function () {
    const matchesText = $(this).text().toLowerCase().includes(text);
    const group = $(this).find(".d-none").text().trim();
    let matchesGroup = selectedGroup === "all" || group === selectedGroup;

    // Si le groupe sélectionné est "Menacé", vérifier si le cd_ref du taxon est dans la liste menacée
    if (selectedGroup === "threatened") {
      const cdRef = $(this).attr("cdref");  // Suppose que chaque <li> a un attribut data-cdRef
      matchesGroup = threatenedTaxons.includes(Number(cdRef));  // Vérifier si le cd_ref du taxon est menacé
    }

    this.style.setProperty("display", matchesText && matchesGroup ? "flex" : "none", "important");
  });
}

// 4. Événements
$("#taxonInput").on("keyup", applyCombinedFilter);

$("#groupFilterList").on("click", ".dropdown-item", function (e) {
  e.preventDefault();
  selectedGroup = $(this).data("group");
  $("#groupFilterDropdown").text(`Groupe : ${selectedGroup === "all" ? "Tous" : selectedGroup}`);
  applyCombinedFilter();
});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
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

  const fileName = document.getElementById("exportCsvBtn").dataset.filename || "liste_taxons.csv";
  const csvContent = rows.map(row => row.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});


document.getElementById("exportPdfBtn").addEventListener("click", async () => {
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

  doc.setFontSize(12);
  doc.text("Liste des taxons visibles", 14, 15);

  const headers = [
    [
      "Cd_ref",
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
        taxon.cd_ref || "-",
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
    startY: 20,
    head: headers,
    body: data,
    styles: { fontSize: 9, cellPadding: 1 },
    headStyles: { fillColor: [40, 60, 100], halign: 'center' },
    margin: { top: 20 },
    didParseCell: function (data) {
      const threatenedColumnIndex = 7;
      if (
        data.section === 'body' &&
        data.row.raw[threatenedColumnIndex] ===  true
      ) {
        data.cell.styles.fillColor = [255, 200, 200];
      }
    }
  });

  const fileName = document.getElementById("exportPdfBtn").dataset.filename || "liste_taxons.pdf";
  doc.save(fileName);
});
