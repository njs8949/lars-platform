from unittest import mock

import pytest

from src.core import exaone_tabular


def _env(values):
    return lambda name: values.get(name, "")


def test_predict_posts_multipart_to_classification_endpoint(monkeypatch):
    monkeypatch.setattr(exaone_tabular, "_env_value", _env({"EXAONE_API_KEY": "k", "EXAONE_TABULAR_BASE_URL": "https://api.test/"}))
    fake = mock.Mock(status_code=200)
    fake.json.return_value = {"result_code": 200, "description": None, "data": {"target_columns": ["churn"], "labels": [["yes"]]}}
    with mock.patch.object(exaone_tabular.requests, "post", return_value=fake) as post:
        data = exaone_tabular.predict("classification", b"a,b\n1,2\n", b"a,b\n3,4\n", "churn")
    assert data["labels"] == [["yes"]]
    url = post.call_args.args[0]
    kwargs = post.call_args.kwargs
    assert url == "https://api.test/v1/tabular/classification"
    assert kwargs["headers"]["Authorization"] == "Bearer k"
    assert kwargs["data"] == {"mode": "default", "output_type": "class", "target_columns": ["churn"]}
    assert set(kwargs["files"]) == {"train_file", "test_file"}


def test_regression_default_output_is_point(monkeypatch):
    monkeypatch.setattr(exaone_tabular, "_env_value", _env({"EXAONE_API_KEY": "k"}))
    fake = mock.Mock(status_code=200)
    fake.json.return_value = {"result_code": 200, "data": {"predictions": [[1.0]]}}
    with mock.patch.object(exaone_tabular.requests, "post", return_value=fake) as post:
        exaone_tabular.predict("regression", b"x\n1\n", b"x\n2\n", "price")
    assert post.call_args.kwargs["data"]["output_type"] == "point"
    assert post.call_args.args[0].endswith("/v1/tabular/regression")


def test_missing_key_is_reported(monkeypatch):
    monkeypatch.setattr(exaone_tabular, "_env_value", _env({}))
    with pytest.raises(RuntimeError, match="EXAONE_API_KEY"):
        exaone_tabular.predict("classification", b"a\n1\n", b"a\n2\n", "y")


def test_invalid_output_type_is_rejected(monkeypatch):
    monkeypatch.setattr(exaone_tabular, "_env_value", _env({"EXAONE_API_KEY": "k"}))
    with pytest.raises(ValueError):
        exaone_tabular.predict("classification", b"a\n1\n", b"a\n2\n", "y", output_type="point")


def test_endpoint_returns_predictions(monkeypatch):
    from fastapi.testclient import TestClient
    import app as app_module

    monkeypatch.setattr(exaone_tabular, "_env_value", _env({"EXAONE_API_KEY": "k"}))
    fake = mock.Mock(status_code=200)
    fake.json.return_value = {"result_code": 200, "data": {"labels": [["yes"]]}}
    client = TestClient(app_module.app)
    with mock.patch.object(exaone_tabular.requests, "post", return_value=fake):
        r = client.post(
            "/api/model/exaone-tabular/predict",
            data={"task": "classification", "target": "churn"},
            files={"train_file": ("t.csv", b"a\n1\n", "text/csv"), "test_file": ("p.csv", b"a\n2\n", "text/csv")},
        )
    assert r.status_code == 200
    assert r.json()["data"]["labels"] == [["yes"]]


def test_endpoint_rejects_empty_upload(monkeypatch):
    from fastapi.testclient import TestClient
    import app as app_module

    client = TestClient(app_module.app)
    r = client.post(
        "/api/model/exaone-tabular/predict",
        data={"task": "classification", "target": "churn"},
        files={"train_file": ("t.csv", b"", "text/csv"), "test_file": ("p.csv", b"a\n2\n", "text/csv")},
    )
    assert r.status_code == 400
