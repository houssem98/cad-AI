METHODS = {
    "new_part": "create_part",
    "sketch_rectangle": "create_sketch",
    "sketch_circle": "create_sketch",
    "sketch_polyline": "create_sketch",
    "extrude": "create_feature",
    "cut": "create_feature",
    "hole": "create_feature",
    "fillet": "create_feature",
    "chamfer": "create_feature",
    "modify_dimension": "modify_feature",
    "assign_material": "apply_material",
    "inspect": "inspect_geometry",
    "export": "export_document",
    "import": "import_document",
}


def outcome(status, result=None, verification=None, error=None):
    return {"status": status, "result": result, "verification": verification, "error": error}


def unsupported(what):
    return outcome("unsupported", error={"code": "unsupported", "message": "%s is not supported by this adapter" % what})


class Adapter:
    """One CAD back end. Operation methods take a validated envelope and return outcome(...)."""

    def run(self, op):
        manifest = self.capabilities()
        kind = op["type"]
        if manifest["operations"].get(kind) != "supported":
            return unsupported(kind)
        if kind == "export" and op["params"]["format"] not in manifest["exports"]:
            return unsupported("export to %s" % op["params"]["format"])
        try:
            return getattr(self, METHODS[kind])(op)
        except NotImplementedError:
            return unsupported(kind)
        except Exception as e:
            return outcome("failed", error={"code": "kernel_error", "message": str(e)})

    def connect(self): raise NotImplementedError
    def disconnect(self): raise NotImplementedError
    def health(self): raise NotImplementedError
    def capabilities(self): raise NotImplementedError
    def get_active_document(self): raise NotImplementedError
    def get_document_metadata(self): raise NotImplementedError
    def inspect_feature_tree(self, op): raise NotImplementedError
    def inspect_geometry(self, op): raise NotImplementedError
    def create_part(self, op): raise NotImplementedError
    def create_sketch(self, op): raise NotImplementedError
    def create_feature(self, op): raise NotImplementedError
    def modify_feature(self, op): raise NotImplementedError
    def apply_material(self, op): raise NotImplementedError
    def create_assembly(self, op): raise NotImplementedError
    def create_drawing(self, op): raise NotImplementedError
    def export_document(self, op): raise NotImplementedError
    def import_document(self, op): raise NotImplementedError
    def validate_geometry(self, op): raise NotImplementedError
