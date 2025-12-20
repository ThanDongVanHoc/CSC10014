from . import chat_bp
from flask import send_from_directory, url_for, jsonify
import os
from .forms_data import FORM_METADATA
    
@chat_bp.route('/forms/download/<path:filename>')
def download_form_file(filename):
    BASE_DIR = os.path.join(os.getcwd(), 'Dataset/crawler/forms')
    ext = os.path.splitext(filename)[1].lower()
    if ext == '.pdf':
        return send_from_directory(BASE_DIR, filename, as_attachment=False)
    elif ext == '.docx' :
        return send_from_directory(BASE_DIR, filename, as_attachment=True)
    else:
        return jsonify({"error": "Unsupported file type"}), 400
    
@chat_bp.route('/forms/info/<string:id>')
def get_form_info(id):
    form_entry = next((form for form in FORM_METADATA if form["id"] == id), None)
    if not form_entry:
        return jsonify({"error": "Form ID not found"}), 404
    try:
        pdf_url = url_for('chat.download_form_file', filename=form_entry.get("pdf_filename"))
        docx_url = url_for('chat.download_form_file', filename=form_entry.get("docx_filename"))
        return jsonify({
            "id": id,
            "title": form_entry.get("title_vi"),
            "pdf_url": pdf_url,
            "docx_url": docx_url
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
