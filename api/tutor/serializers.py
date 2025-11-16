from rest_framework import serializers


class EmptySerializer(serializers.Serializer):
    """
    Placeholder serializer for the empty request body.
    This allows us to test the API using the DRF UI
    """


class ChartPointSerializer(serializers.Serializer):
    x = serializers.FloatField()
    y = serializers.FloatField()
    r = serializers.FloatField(required=False)
    title = serializers.CharField(required=False, allow_blank=True)
    label = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False, allow_blank=True)


class EvaluateAnswerSerializer(serializers.Serializer):
    question = serializers.CharField(required=True, allow_blank=False)
    original_question = serializers.DictField(required=True)
    student_solution = serializers.ListField(
        child=ChartPointSerializer(),
        required=True,
        min_length=1,
        error_messages={"min_length": "Student solution must contain at least one point."},
    )
