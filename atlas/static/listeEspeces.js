$(".lazy").lazy({
          effect: "fadeIn",
          effectTime: 2000,
          threshold: 0,
          appendScroll: $("#taxonList")
        });
$('[data-toggle="tooltip"]').tooltip();
$(document).ready(function(){
  $("#taxonInput").on("keyup", function() {
    var value = $(this).val().toLowerCase();
    $("#taxonList li").filter(function() {
      $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
    });
  });
});

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  if (!Array.isArray(taxonsData)) {
    alert("Aucune donnée disponible.");
    return;
  }

  const exportBtn = document.getElementById("exportCsvBtn");
  const fileName = exportBtn.dataset.filename || "liste_taxons.csv";
  // Colonnes
  const rows = [[
    "Nom vernaculaire", "Nom scientifique", "Nb observations", 
    "Dernière année", "Groupe taxonomique", "Patrimonial", 
    "Protection stricte"
  ]];

  taxonsData.forEach(taxon => {
    const nomVern = taxon.nom_vern || "-";
    const nomSci = (taxon.nom_complet_html || "-").replace(/<[^>]*>/g, ""); // enlève balises HTML
    const nbObs = taxon.nb_obs || "0";
    const lastYear = taxon.last_obs || "-";
    const taxonomicGroup = taxon.group2_inpn;
    const patrimonial = taxon.patrimonial;
    const strictProtection = taxon.protection_stricte         

    rows.push([nomVern, nomSci, nbObs, lastYear, taxonomicGroup, patrimonial, strictProtection]);
  });

  // CSV
  const csvContent = rows.map(row => row.join(";")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});