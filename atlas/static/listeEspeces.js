$(".lazy").lazy({
          effect: "fadeIn",
          effectTime: 2000,
          threshold: 0,
          appendScroll: $("#taxonList")
        });
$('[data-toggle="tooltip"]').tooltip();
$(document).ready(function(){
  $("#taxonInput").on("keyup", function() {
    const value = $(this).val().toLowerCase();
    $("#taxonList li").each(function() {
      const match = $(this).text().toLowerCase().includes(value);
      this.style.setProperty("display", match ? "flex" : "none", "important");
    });
  });
});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  if (!Array.isArray(taxonsData)) {
    alert("Aucune donnée disponible.");
    return;
  }

  // Récupérer tous les cd_ref visibles à l'écran
  const visibleCdRefs = Array.from(document.querySelectorAll("#taxonList li"))
  .filter(li => window.getComputedStyle(li).display !== "none")
  .map(li => {
    const link = li.querySelector("a[href*='/espece/']");
    if (!link) return null;
    const match = link.getAttribute("href").match(/\/espece\/(\d+)/);
    return match ? match[1] : null;
  })
  .filter(cdref => cdref !== null);

  if (visibleCdRefs.length === 0) {
    alert("Aucun taxon à exporter.");
    return;
  }

  // Colonnes du CSV
  const rows = [[
    "Nom vernaculaire", "Nom scientifique", "Nb observations", 
    "Dernière année", "Groupe taxonomique", "Patrimonial", 
    "Protection stricte"
  ]];

  // Filtrer les taxons visibles dans taxonsData
  taxonsData.forEach(taxon => {
    if (!visibleCdRefs.includes(String(taxon.cd_ref))) return;

    const nomVern = taxon.nom_vern || "-";
    const nomSci = (taxon.nom_complet_html || "-").replace(/<[^>]*>/g, "");
    const nbObs = taxon.nb_obs || "0";
    const lastYear = taxon.last_obs || "-";
    const taxonomicGroup = taxon.group2_inpn || "-";
    const patrimonial = taxon.patrimonial || "-";
    const strictProtection = taxon.protection_stricte || "-";

    rows.push([nomVern, nomSci, nbObs, lastYear, taxonomicGroup, patrimonial, strictProtection]);
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