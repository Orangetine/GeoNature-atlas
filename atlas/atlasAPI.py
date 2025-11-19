# -*- coding:utf-8 -*-

from flask import jsonify, Blueprint, request, current_app

from atlas import utils
from atlas.modeles.repositories import (
    vmSearchTaxonRepository,
    vmObservationsRepository,
    vmObservationsMaillesRepository,
    vmMedias,
    vmCommunesRepository,
)
from atlas.env import cache, db

api = Blueprint("api", __name__)


@api.route("/searchTaxon", methods=["GET"])
def searchTaxonAPI():
    with db.session() as session:
        search = request.args.get("search", "")
        limit = request.args.get("limit", 50)
        results = vmSearchTaxonRepository.searchTaxons(session, search, limit)
    return jsonify(results)


@api.route("/searchCommune", methods=["GET"])
def searchCommuneAPI():
    with db.session() as session:
        search = request.args.get("search", "")
        limit = request.args.get("limit", 50)
        results = vmCommunesRepository.searchMunicipalities(session, search, limit)
    return jsonify(results)


if not current_app.config["AFFICHAGE_MAILLE"]:

    @api.route("/observationsMailleAndPoint/<int(signed=True):cd_ref>", methods=["GET"])
    def getObservationsMailleAndPointAPI(cd_ref):
        """
        Retourne les observations d'un taxon en point et en maille

        :returns: dict ({'point:<GeoJson>', 'maille': 'GeoJson})
        """
        with db.session() as session:
            observations = {
                "point": vmObservationsRepository.searchObservationsChilds(session, cd_ref),
                "maille": vmObservationsMaillesRepository.getObservationsMaillesChilds(
                    session, cd_ref
                ),
            }
        return jsonify(observations)


@api.route("/observationsMaille/<int(signed=True):cd_ref>", methods=["GET"])
def getObservationsMailleAPI(cd_ref):
    """
    Retourne les observations d'un taxon par maille (et le nombre d'observation par maille)

    :returns: GeoJson
    """
    with db.session() as session:
        observations = vmObservationsMaillesRepository.getObservationsMaillesChilds(
            session,
            cd_ref,
            year_min=request.args.get("year_min"),
            year_max=request.args.get("year_max"),
        )
    return jsonify(observations)


if not current_app.config["AFFICHAGE_MAILLE"]:

    @api.route("/observationsPoint/<int(signed=True):cd_ref>", methods=["GET"])
    def getObservationsPointAPI(cd_ref):
        with db.session() as session:
            observations = vmObservationsRepository.searchObservationsChilds(session, cd_ref)
        return jsonify(observations)


@api.route("/observations/<int(signed=True):cd_ref>", methods=["GET"])
def getObservationsGenericApi(cd_ref: int):
    """[summary]

    Args:
        cd_ref (int): [description]

    Returns:
        [type]: [description]
    """
    with db.session() as session:
        if current_app.config["AFFICHAGE_MAILLE"]:
            observations = vmObservationsMaillesRepository.getObservationsMaillesChilds(
                session,
                cd_ref,
                year_min=request.args.get("year_min"),
                year_max=request.args.get("year_max"),
            )
        else:
            observations = vmObservationsRepository.searchObservationsChilds(session, cd_ref)
    return jsonify(observations)


if not current_app.config["AFFICHAGE_MAILLE"]:

    @api.route("/observations/<insee>/<int(signed=True):cd_ref>", methods=["GET"])
    def getObservationsCommuneTaxonAPI(insee, cd_ref):
        with db.engine.connect() as connection:
            observations = vmObservationsRepository.getObservationTaxonCommune(
                connection, insee, cd_ref
            )
        return jsonify(observations)


@api.route("/observationsMaille/<insee>/<int(signed=True):cd_ref>", methods=["GET"])
def getObservationsCommuneTaxonMailleAPI(insee, cd_ref):
    with db.engine.connect() as connection:
        observations = vmObservationsMaillesRepository.getObservationsTaxonCommuneMaille(
            connection, insee, cd_ref
        )
    return jsonify(observations)


@api.route("/photoGroup/<group>", methods=["GET"])
def getPhotosGroup(group):
    with db.engine.connect() as connection :
        photos = vmMedias.getPhotosGalleryByGroup(
            connection,
            current_app.config["ATTR_MAIN_PHOTO"],
            current_app.config["ATTR_OTHER_PHOTO"],
            group,
        )
    return jsonify(photos)


@api.route("/photosGallery", methods=["GET"])
def getPhotosGallery():
    with db.engine.connect() as connection:
        photos = vmMedias.getPhotosGallery(
            connection, current_app.config["ATTR_MAIN_PHOTO"], current_app.config["ATTR_OTHER_PHOTO"]
        )
    return jsonify(photos)


@api.route("/main_stat", methods=["GET"])
@cache.cached()
def main_stat():
    with db.engine.connect() as connection:
        return vmObservationsRepository.statIndex(connection)


@api.route("/rank_stat", methods=["GET"])
@cache.cached()
def rank_stat():
    with db.engine.connect() as connection:
        return jsonify(
            vmObservationsRepository.genericStat(connection, current_app.config["RANG_STAT"])
        )
