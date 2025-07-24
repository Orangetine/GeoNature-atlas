CREATE MATERIALIZED VIEW atlas.vm_taxons_areas AS
WITH reproduction_id AS (
	SELECT id_nomenclature FROM synthese.t_nomenclatures t
		JOIN synthese.bib_nomenclatures_types bnt 
		ON bnt.id_type = t.id_type
		WHERE t.mnemonique = 'Reproduction' 
), obs_area as (
	SELECT DISTINCT
    vca.id_area,
    vmo.id_observation,
    vmo.cd_ref,
    vmo.dateobs,
    vmo.observateurs,
	tx.nom_complet_html,
	tx.nom_vern,
	tx.lb_nom,
	tx.group2_inpn,
	tx.patrimonial,
	tx.protection_stricte,
	(s.id_nomenclature_bio_status IN 
		(SELECT id_nomenclature FROM reproduction_id)) as reproduction,
	CASE 
		WHEN s.id_nomenclature_bio_status IN (SELECT id_nomenclature FROM reproduction_id)
		THEN EXTRACT(YEAR FROM vmo.dateobs)::int
		ELSE NULL
	END AS reproduction_year,
	st.code_statut,
	st.cd_type_statut,
	st.cd_sig,
	st.code_statut in ('VU', 'CR', 'EN') as threatened,
	CASE WHEN st.regroupement_type = 'Liste rouge'
		THEN jsonb_build_object(
			'territoire', st.lb_adm_tr,
			'code statut', st.code_statut,
			'label statut', st.label_statut,
			'type statut' , st.lb_type_statut,
			'texte', st.full_citation,
			'url', st.doc_url)
		ELSE '{}'::jsonb
		END AS threatened_species,
		
	CASE WHEN st.regroupement_type <> 'Liste rouge'
		THEN jsonb_build_object(
			'territoire', st.lb_adm_tr,
			'code statut', st.code_statut,
			'label statut', st.label_statut,
			'type statut' , st.lb_type_statut,
			'texte', st.full_citation,
			'url', st.doc_url)
		ELSE '{}'::jsonb
		END AS protected_species
		
FROM atlas.vm_cor_area_synthese vca
JOIN atlas.vm_observations vmo ON vmo.id_observation = vca.id_synthese
JOIN atlas.vm_taxons tx on tx.cd_ref = vmo.cd_ref
LEFT OUTER JOIN atlas.vm_bdc_statut st on st.cd_ref = tx.cd_ref
LEFT OUTER JOIN synthese.syntheseff s on s.id_synthese = vmo.id_observation
) 
SELECT ROW_NUMBER() OVER() as id, * FROM obs_area;

CREATE INDEX idx_vm_taxons_areas_cd_ref ON atlas.vm_taxons_areas(cd_ref);
CREATE INDEX idx_vm_taxons_areas_id_area ON atlas.vm_taxons_areas(id_area);
CREATE INDEX idx_vm_taxons_areas_id_obs ON atlas.vm_taxons_areas(id_observation);
