# -*- coding:utf-8 -*-

from flask import current_app
from sqlalchemy.sql import text, func, distinct, select

from atlas.modeles import utils
from atlas.modeles.entities.vmTaxons import VmTaxonsAreas
from atlas.modeles.entities.vmMedias import VmMedias


def getTaxonsTerritory(connection):
    sql = """
      SELECT DISTINCT
          o.cd_ref, max(date_part('year'::text, o.dateobs)) as last_obs,
          COUNT(o.id_observation) AS nb_obs, t.nom_complet_html, t.nom_vern,
          t.group2_inpn, t.patrimonial, t.protection_stricte,
          m.url, m.chemin, m.id_media
      FROM atlas.vm_observations o
      JOIN atlas.vm_taxons t ON t.cd_ref=o.cd_ref
      LEFT JOIN atlas.vm_medias m ON m.cd_ref=o.cd_ref AND m.id_type={}
      GROUP BY o.cd_ref, t.nom_vern, t.nom_complet_html, t.group2_inpn,
          t.patrimonial, t.protection_stricte, m.url, m.chemin, m.id_media
      ORDER BY nb_obs DESC
  """.format(
        current_app.config["ATTR_MAIN_PHOTO"]
    )
    req = connection.execute(text(sql))
    taxonCommunesList = list()
    nbObsTotal = 0
    for r in req:
        temp = {
            "nom_complet_html": r.nom_complet_html,
            "nb_obs": r.nb_obs,
            "nom_vern": r.nom_vern,
            "cd_ref": r.cd_ref,
            "last_obs": r.last_obs,
            "group2_inpn": utils.deleteAccent(r.group2_inpn),
            "patrimonial": r.patrimonial,
            "protection_stricte": r.protection_stricte,
            "path": utils.findPath(r),
            "id_media": r.id_media,
        }
        taxonCommunesList.append(temp)
        nbObsTotal = nbObsTotal + r.nb_obs
    return {"taxons": taxonCommunesList, "nbObsTotal": nbObsTotal}


# With distinct the result in a array not an object, 0: lb_nom, 1: nom_vern
def getTaxonsAreas(session, id_area):
    id_photo = current_app.config["ATTR_MAIN_PHOTO"]
    req = (
        select(
            VmTaxonsAreas.cd_ref,
            func.max(func.date_part("year", VmTaxonsAreas.dateobs)).label("last_obs"),
            func.count(distinct(VmTaxonsAreas.id_observation)).label("nb_obs"),
            func.count(distinct(VmTaxonsAreas.observateurs)).label("nb_observers"),
            VmTaxonsAreas.nom_complet_html,
            VmTaxonsAreas.nom_vern,
            VmTaxonsAreas.lb_nom,
            VmTaxonsAreas.group2_inpn,
            VmTaxonsAreas.patrimonial,
            VmTaxonsAreas.protection_stricte,
            VmMedias.url,
            VmMedias.chemin,
            VmMedias.id_media,
        )
        .distinct()
        .outerjoin(
            VmMedias, (VmMedias.cd_ref == VmTaxonsAreas.cd_ref) & (VmMedias.id_type == id_photo)
        )
        .filter(VmTaxonsAreas.id_area == id_area)
        .group_by(
            VmTaxonsAreas.cd_ref,
            VmTaxonsAreas.nom_vern,
            VmTaxonsAreas.lb_nom,
            VmTaxonsAreas.nom_complet_html,
            VmTaxonsAreas.group2_inpn,
            VmTaxonsAreas.patrimonial,
            VmTaxonsAreas.protection_stricte,
            VmMedias.url,
            VmMedias.chemin,
            VmMedias.id_media,
        )
        .order_by(
            func.count(distinct(VmTaxonsAreas.id_observation)).desc()
        )
    )
    results = session.execute(req).all()
    taxonAreasList = list()
    nbObsTotal = 0
    for r in results:
        temp = {
            "nom_complet_html": r.nom_complet_html,
            "nb_obs": r.nb_obs,
            "nb_observers": r.nb_observers,
            "nom_vern": r.nom_vern,
            "lb_nom": r.lb_nom,
            "cd_ref": r.cd_ref,
            "last_obs": r.last_obs,
            "group2_inpn": utils.deleteAccent(r.group2_inpn),
            "patrimonial": r.patrimonial,
            "protection_stricte": r.protection_stricte,
            "path": utils.findPath(r),
            "id_media": r.id_media,
        }
        taxonAreasList.append(temp)
        nbObsTotal = nbObsTotal + r.nb_obs
    return {"taxons": taxonAreasList, "nbObsTotal": nbObsTotal}

def getThreatenedTaxonsAreas(session, id_area):
    req = (
        select(
            VmTaxonsAreas.cd_ref,
            VmTaxonsAreas.threatened,
            VmTaxonsAreas.code_statut,
        )
        .filter(
            VmTaxonsAreas.cd_sig == 'INSEER11',
            VmTaxonsAreas.threatened == True,
            VmTaxonsAreas.id_area == id_area,
        )
        .group_by(
            VmTaxonsAreas.cd_ref,
            VmTaxonsAreas.threatened,
            VmTaxonsAreas.code_statut
        )
    )
    results = session.execute(req).all()
    taxonThreatenedAreasList = list()
    cdRefThreatenedAreasList = list()
    for r in results:
        temp = {
            "cd_ref": r.cd_ref,
            "threatened": r.threatened,
            "code_statut": r.code_statut, 
        }
        taxonThreatenedAreasList.append(temp)
        cdRefThreatenedAreasList.append(r.cd_ref)
    return {
        "threatened_taxons": taxonThreatenedAreasList, 
        "nb_threatened_species": len(cdRefThreatenedAreasList) ,
        "cd_refs" : cdRefThreatenedAreasList,
    }


def getTaxonsChildsList(connection, cd_ref):
    sql = """
        SELECT DISTINCT nom_complet_html, nb_obs, nom_vern, tax.cd_ref,
            yearmax, group2_inpn, patrimonial, protection_stricte,
            chemin, url, m.id_media
        FROM atlas.vm_taxons tax
        JOIN atlas.bib_taxref_rangs bib_rang
        ON trim(tax.id_rang)= trim(bib_rang.id_rang)
        LEFT JOIN atlas.vm_medias m
        ON m.cd_ref = tax.cd_ref AND m.id_type={}
        WHERE tax.cd_ref IN (
            SELECT * FROM atlas.find_all_taxons_childs(:thiscdref)
        ) """.format(
        str(current_app.config["ATTR_MAIN_PHOTO"])
    )
    req = connection.execute(text(sql), thiscdref=cd_ref)
    taxonRankList = list()
    nbObsTotal = 0
    for r in req:
        temp = {
            "nom_complet_html": r.nom_complet_html,
            "nb_obs": r.nb_obs,
            "nom_vern": r.nom_vern,
            "cd_ref": r.cd_ref,
            "last_obs": r.yearmax,
            "group2_inpn": utils.deleteAccent(r.group2_inpn),
            "patrimonial": r.patrimonial,
            "protection_stricte": r.protection_stricte,
            "path": utils.findPath(r),
            "id_media": r.id_media,
        }
        taxonRankList.append(temp)
        nbObsTotal = nbObsTotal + r.nb_obs
    return {"taxons": taxonRankList, "nbObsTotal": nbObsTotal}


def getINPNgroupPhotos(connection):
    """
    Get list of INPN groups with at least one photo
    """

    sql = """
        SELECT DISTINCT count(*) AS nb_photos, group2_inpn
        FROM atlas.vm_taxons T
        JOIN atlas.vm_medias M ON M.cd_ref = T.cd_ref
        GROUP BY group2_inpn
        ORDER BY nb_photos DESC
    """
    req = connection.execute(text(sql))
    groupList = list()
    for r in req:
        temp = {"group": utils.deleteAccent(r.group2_inpn), "groupAccent": r.group2_inpn}
        groupList.append(temp)
    return groupList


def getTaxonsGroup(connection, groupe):
    sql = """
        SELECT t.cd_ref, t.nom_complet_html, t.nom_vern, t.nb_obs,
            t.group2_inpn, t.protection_stricte, t.patrimonial, t.yearmax,
            m.chemin, m.url, m.id_media,
            t.nb_obs
        FROM atlas.vm_taxons t
        LEFT JOIN atlas.vm_medias m
        ON m.cd_ref = t.cd_ref AND m.id_type={}
        WHERE t.group2_inpn = :thisGroupe
        GROUP BY t.cd_ref, t.nom_complet_html, t.nom_vern, t.nb_obs,
            t.group2_inpn, t.protection_stricte, t.patrimonial, t.yearmax,
            m.chemin, m.url, m.id_media
        """.format(
        current_app.config["ATTR_MAIN_PHOTO"]
    )
    req = connection.execute(text(sql), thisGroupe=groupe)
    tabTaxons = list()
    nbObsTotal = 0
    for r in req:
        nbObsTotal = nbObsTotal + r.nb_obs
        temp = {
            "nom_complet_html": r.nom_complet_html,
            "nb_obs": r.nb_obs,
            "nom_vern": r.nom_vern,
            "cd_ref": r.cd_ref,
            "last_obs": r.yearmax,
            "group2_inpn": utils.deleteAccent(r.group2_inpn),
            "patrimonial": r.patrimonial,
            "protection_stricte": r.protection_stricte,
            "id_media": r.id_media,
            "path": utils.findPath(r),
        }
        tabTaxons.append(temp)
    return {"taxons": tabTaxons, "nbObsTotal": nbObsTotal}


# get all groupINPN
def getAllINPNgroup(connection):
    sql = """
        SELECT SUM(nb_obs) AS som_obs, group2_inpn
        FROM atlas.vm_taxons
        GROUP BY group2_inpn
        ORDER BY som_obs DESC
    """
    req = connection.execute(text(sql))
    groupList = list()
    for r in req:
        temp = {"group": utils.deleteAccent(r.group2_inpn), "groupAccent": r.group2_inpn}
        groupList.append(temp)
    return groupList
