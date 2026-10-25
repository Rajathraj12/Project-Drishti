from rest_framework import serializers
from .models import Project
from .risk_engine import analyze_project_risk


def _calc_project_risk(obj):
    if not hasattr(obj, '_cached_risk'):
        try:
            orig = float(obj.original_cost) if obj.original_cost else 0
            rev = float(obj.revised_cost) if obj.revised_cost else 0
            exp = float(obj.expenditure) if obj.expenditure else 0
            orig_cr = orig / 10000000 if orig > 10000000 else orig
            rev_cr = rev / 10000000 if rev > 10000000 else rev
            exp_cr = exp / 10000000 if exp > 10000000 else exp

            doc = {
                'project_id': obj.project_id,
                'original_cost_cr': orig_cr,
                'revised_cost_cr': rev_cr,
                'expenditure_cr': exp_cr,
                'reported_progress_pct': obj.reported_progress,
            }
            obj._cached_risk = analyze_project_risk(doc)
        except Exception:
            obj._cached_risk = {}
    return obj._cached_risk


class ProjectSerializer(serializers.ModelSerializer):
    original_cost_cr = serializers.SerializerMethodField()
    revised_cost_cr = serializers.SerializerMethodField()
    expenditure_cr = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()
    anomaly_status = serializers.SerializerMethodField()
    anomaly_flag = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('project_id', 'source_project_id', 'data_source_type', 'created_at', 'updated_at')

    def get_original_cost_cr(self, obj):
        v = float(obj.original_cost) if obj.original_cost else 0
        return round(v / 10000000 if v > 10000000 else v, 2)

    def get_revised_cost_cr(self, obj):
        v = float(obj.revised_cost) if obj.revised_cost else 0
        return round(v / 10000000 if v > 10000000 else v, 2)

    def get_expenditure_cr(self, obj):
        v = float(obj.expenditure) if obj.expenditure else 0
        return round(v / 10000000 if v > 10000000 else v, 2)

    def get_risk_level(self, obj):
        return _calc_project_risk(obj).get('risk_level', 'Low')

    def get_risk_score(self, obj):
        return _calc_project_risk(obj).get('risk_score', 0)

    def get_anomaly_status(self, obj):
        r = _calc_project_risk(obj)
        score = r.get('risk_score') or 0
        return "ANOMALOUS" if (r.get('risk_level') == 'High' or score >= 60) else "NORMAL"

    def get_anomaly_flag(self, obj):
        return self.get_anomaly_status(obj) == "ANOMALOUS"


class PublicProjectSerializer(serializers.ModelSerializer):
    original_cost_cr = serializers.SerializerMethodField()
    revised_cost_cr = serializers.SerializerMethodField()
    expenditure_cr = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()
    anomaly_status = serializers.SerializerMethodField()
    anomaly_flag = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'project_id',
            'source_project_id',
            'project_name',
            'project_description',
            'state',
            'district',
            'scheme',
            'department',
            'project_category',
            'work_type',
            'location_from',
            'location_to',
            'latitude',
            'longitude',
            'original_cost',
            'original_cost_cr',
            'revised_cost',
            'revised_cost_cr',
            'expenditure',
            'expenditure_cr',
            'reported_progress',
            'data_source_type',
            'verification_status',
            'is_public',
            'risk_level',
            'risk_score',
            'anomaly_status',
            'anomaly_flag',
        )
        read_only_fields = fields

    def get_original_cost_cr(self, obj):
        v = float(obj.original_cost) if obj.original_cost else 0
        return round(v / 10000000 if v > 10000000 else v, 2)

    def get_revised_cost_cr(self, obj):
        v = float(obj.revised_cost) if obj.revised_cost else 0
        return round(v / 10000000 if v > 10000000 else v, 2)

    def get_expenditure_cr(self, obj):
        v = float(obj.expenditure) if obj.expenditure else 0
        return round(v / 10000000 if v > 10000000 else v, 2)

    def get_risk_level(self, obj):
        return _calc_project_risk(obj).get('risk_level', 'Low')

    def get_risk_score(self, obj):
        return _calc_project_risk(obj).get('risk_score', 0)

    def get_anomaly_status(self, obj):
        r = _calc_project_risk(obj)
        score = r.get('risk_score') or 0
        return "ANOMALOUS" if (r.get('risk_level') == 'High' or score >= 60) else "NORMAL"

    def get_anomaly_flag(self, obj):
        return self.get_anomaly_status(obj) == "ANOMALOUS"
