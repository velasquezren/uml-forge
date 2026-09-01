import type { Node, Edge } from '@xyflow/react';
import type {
  UMLClass,
  UMLEnum,
  UMLOperation,
  UMLProperty,
  UMLRelationship,
  Visibility,
} from '@uml-forge/uml-core';

export const VISIBILITY_SYMBOLS: Record<Visibility, string> = {
  public: '+',
  private: '-',
  protected: '#',
  package: '~',
};

export interface EnumLiteralItem {
  id: string;
  name: string;
}

export interface UmlClassNodeData extends Record<string, unknown> {
  classifierId: string;
  name: string;
  isAbstract?: boolean;
  isInterface?: boolean;
  isEnum?: boolean;
  visibility?: Visibility;
  stereotypes?: string[];
  attributes: UMLProperty[];
  operations: UMLOperation[];
  literals?: EnumLiteralItem[];
}

export type UmlNode = Node<UmlClassNodeData, 'umlClass'>;

export interface UmlRelationshipEdgeData extends Record<string, unknown> {
  relationshipId: string;
  type: UMLRelationship['kind'];
  name?: string;
  sourceRole?: string;
  targetRole?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  isNavigable?: boolean;
}

export type UmlEdge = Edge<UmlRelationshipEdgeData, 'umlRelationship'>;

export interface UserAwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
  };
  cursor?: {
    x: number;
    y: number;
  };
  selectedElementId?: string | null;
}

export interface SelectedElement {
  type: 'classifier' | 'attribute' | 'operation' | 'relationship';
  id: string;
  parentId?: string;
  element: UMLClass | UMLEnum | UMLProperty | UMLOperation | UMLRelationship;
}
