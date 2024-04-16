# -*- coding:utf-8 -*-

import ast

from flask import current_app
from sqlalchemy import distinct
from sqlalchemy.sql import text
from sqlalchemy.sql.expression import func

from atlas.modeles.entities.vmCommunes import VmCommunes


def getAllCommunes(session):
    req = session.query(distinct(VmCommunes.commune_maj), VmCommunes.insee).all()
    communeList = list()
    for r in req:
        temp = {"label": r[0], "value": r[1]}
        communeList.append(temp)
    return communeList


def getCommunesSearch(session, search, limit=50):
    req = session.query(
        distinct(VmCommunes.commune_maj), VmCommunes.insee, func.length(VmCommunes.commune_maj)
    ).filter(VmCommunes.commune_maj.ilike("%" + search + "%"))

    req = req.order_by(VmCommunes.commune_maj)

    req = req.limit(limit).all()

    communeList = list()
    for r in req:
        temp = {"label": r[0], "value": r[1]}
        communeList.append(temp)
    return communeList


def getCommuneFromInsee(connection, insee):
    sql = """
        SELECT c.commune_maj,
           c.insee,
           c.commune_geojson
        FROM atlas.vm_communes c
        WHERE c.insee = :thisInsee
    """
    req = connection.execute(text(sql), thisInsee=insee)
    communeObj = dict()
    for r in req:
        communeObj = {
            "areaName": r.commune_maj,
            "areaCode": str(r.insee),
            "areaGeoJson": ast.literal_eval(r.commune_geojson),
        }
    return communeObj


def getCommunesObservationsChilds(connection, cd_ref):
    sql = "SELECT * FROM atlas.find_all_taxons_childs(:thiscdref) AS taxon_childs(cd_nom)"
    results = connection.execute(text(sql), thiscdref=cd_ref)
    taxons = [cd_ref]
    for r in results:
        taxons.append(r.cd_nom)

    sql = """
        SELECT DISTINCT
            com.commune_maj,
            com.insee
        FROM atlas.vm_observations AS obs
            JOIN atlas.vm_communes AS com
                ON obs.insee = com.insee
        WHERE obs.cd_ref = ANY(:taxonsList)
        ORDER BY com.commune_maj ASC
    """
    results = connection.execute(text(sql), taxonsList=taxons)
    municipalities = list()
    for r in results:
        municipality = {"insee": r.insee, "commune_maj": r.commune_maj}
        municipalities.append(municipality)
    return municipalities
