from . import map_bp
from flask import current_app
from app.db import db
from app.db.models import User
import requests
import json


def get_local_profile(user_email: str = None, user_id: int = None) -> dict:
	"""Try to read dob/nationality (and other local fields) from local DB.

	Prefer lookup by `user_id` if provided, otherwise by `user_email`.
	Returns a dict (may be empty).
	"""
	stmt = None
	try:
		if user_id is not None:
			stmt = db.session.get(User, user_id)
		elif user_email is not None:
			stmt = db.session.scalar(db.select(User).filter_by(email=user_email))
		else:
			return {}

		if not stmt:
			return {}

		data = stmt.to_dict()

		# If `media` stores JSON with extra profile fields, try to parse it
		media = data.get('media')
		if media:
			try:
				media_obj = json.loads(media)
				# merge media fields into data (media wins on specific fields)
				data.update(media_obj)
			except Exception:
				pass

		# Only return relevant fields for aggregator
		return {
			'dob': data.get('dob') or data.get('birth') or data.get('birth_date'),
			'nationality': data.get('nationality') or data.get('country'),
			'raw': data,
		}
	except Exception:
		return {}


def get_profile_service(user_email: str = None, user_id: int = None) -> dict:
	"""Call external Profile Service GET endpoint and return parsed JSON.

	The base URL is read from `PROFILE_SERVICE_URL` config or env var.
	"""
	base = current_app.config.get('PROFILE_SERVICE_URL') or current_app.config.get('PROFILE_URL') or None
	if not base:
		base = current_app.config.get('PROFILE_SERVICE') or None

	if not base:
		# no external profile configured
		return {}

	# Build endpoint heuristically
	if user_id is not None:
		url = f"{base.rstrip('/')}/profile/{user_id}"
	elif user_email:
		url = f"{base.rstrip('/')}/profile?email={user_email}"
	else:
		return {}

	headers = {}
	token = current_app.config.get('PROFILE_SERVICE_TOKEN')
	if token:
		headers['Authorization'] = f"Bearer {token}"

	try:
		resp = requests.get(url, headers=headers, timeout=5)
		resp.raise_for_status()
		return resp.json()
	except Exception:
		return {}


def aggregate_profile(user_email: str = None, user_id: int = None) -> dict:
	"""Merge local DB profile (dob/nationality) with external Profile Service data.

	Local DB values take precedence for `dob` and `nationality` when present.
	"""
	local = get_local_profile(user_email=user_email, user_id=user_id) or {}
	remote = get_profile_service(user_email=user_email, user_id=user_id) or {}

	merged = {}
	# Start with remote, then overlay local fields
	if isinstance(remote, dict):
		merged.update(remote)

	# Overlay explicit local dob/nationality if present
	if local.get('dob'):
		merged['dob'] = local.get('dob')
	if local.get('nationality'):
		merged['nationality'] = local.get('nationality')

	# include raw local and remote for debugging by FE if needed
	merged['_local'] = local.get('raw')
	merged['_remote'] = remote

	return merged


def orchestrate_map(symptoms: dict, user_email: str = None, user_id: int = None) -> dict:
	"""Build Payload A (symptoms + profile) and send to Med Map Service.

	Returns the JSON response from Med Map Service (or an error dict).
	"""
	profile = aggregate_profile(user_email=user_email, user_id=user_id)

	payload = {
		'symptoms': symptoms,
		'profile': profile,
	}

	med_map_url = current_app.config.get('MED_MAP_SERVICE_URL') or current_app.config.get('MED_MAP_URL')
	if not med_map_url:
		return {'error': 'Med Map service URL not configured'}

	headers = {'Content-Type': 'application/json'}
	token = current_app.config.get('MED_MAP_SERVICE_TOKEN')
	if token:
		headers['Authorization'] = f"Bearer {token}"

	try:
		resp = requests.post(med_map_url.rstrip('/') + '/map', json=payload, headers=headers, timeout=10)
		resp.raise_for_status()
		return resp.json()
	except requests.RequestException as e:
		return {'error': 'med_map_request_failed', 'detail': str(e)}


def orchestrate_card(symptoms: dict, user_email: str = None, user_id: int = None) -> dict:
	"""Build Payload B (symptoms + profile) and send to Card Service.

	Returns the JSON response from Card Service (or an error dict).
	"""
	profile = aggregate_profile(user_email=user_email, user_id=user_id)

	payload = {
		'symptoms': symptoms,
		'profile': profile,
	}

	card_url = current_app.config.get('CARD_SERVICE_URL') or current_app.config.get('CARD_URL')
	if not card_url:
		return {'error': 'Card service URL not configured'}

	headers = {'Content-Type': 'application/json'}
	token = current_app.config.get('CARD_SERVICE_TOKEN')
	if token:
		headers['Authorization'] = f"Bearer {token}"

	try:
		resp = requests.post(card_url.rstrip('/') + '/card', json=payload, headers=headers, timeout=10)
		resp.raise_for_status()
		return resp.json()
	except requests.RequestException as e:
		return {'error': 'card_request_failed', 'detail': str(e)}

