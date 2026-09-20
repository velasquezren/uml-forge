/**
 * Fragmento representativo de una exportacion de Sparx Enterprise Architect:
 * clases dentro de un paquete, tipos por referencia `xmi:idref`, el extremo
 * navegable de la asociacion como `ownedAttribute` de la clase, `-1` como
 * infinito y la extension propia de la herramienta.
 */
export const enterpriseArchitectXmi = `<?xml version="1.0" encoding="windows-1252"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">
  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5" exporterID="1628"/>
  <uml:Model xmi:type="uml:Model" name="EA_Model" visibility="public">
    <packagedElement xmi:type="uml:Package" xmi:id="EAPK_11111111" name="Clinica" visibility="public">
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_OWNER0001" name="Owner" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_ATTR0001" name="fullName" visibility="private">
          <type xmi:idref="EAJava_String"/>
          <lowerValue xmi:type="uml:LiteralInteger" xmi:id="EAID_LI000001" value="1"/>
          <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="EAID_LU000001" value="1"/>
        </ownedAttribute>
        <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_END00001" name="pets" visibility="public" association="EAID_ASSOC001" aggregation="none">
          <type xmi:idref="EAID_PET000001"/>
          <lowerValue xmi:type="uml:LiteralInteger" xmi:id="EAID_LI000002" value="0"/>
          <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="EAID_LU000002" value="-1"/>
        </ownedAttribute>
        <ownedOperation xmi:type="uml:Operation" xmi:id="EAID_OP000001" name="adopt" visibility="public">
          <ownedParameter xmi:type="uml:Parameter" xmi:id="EAID_PAR00001" name="pet" direction="in">
            <type xmi:idref="EAID_PET000001"/>
          </ownedParameter>
        </ownedOperation>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_PET000001" name="Pet" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_ATTR0002" name="name" visibility="private">
          <type xmi:idref="EAJava_String"/>
        </ownedAttribute>
        <generalization xmi:type="uml:Generalization" xmi:id="EAID_GEN00001" general="EAID_ANIMAL01"/>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_ANIMAL01" name="Animal" visibility="public" isAbstract="true"/>
      <packagedElement xmi:type="uml:Enumeration" xmi:id="EAID_SPECIES1" name="Species" visibility="public">
        <ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="EAID_LIT00001" name="DOG"/>
        <ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="EAID_LIT00002" name="CAT"/>
      </packagedElement>
      <packagedElement xmi:type="uml:Association" xmi:id="EAID_ASSOC001" name="tiene" visibility="public">
        <memberEnd xmi:idref="EAID_END00001"/>
        <memberEnd xmi:idref="EAID_END00002"/>
        <ownedEnd xmi:type="uml:Property" xmi:id="EAID_END00002" name="owner" visibility="public" association="EAID_ASSOC001" aggregation="composite">
          <type xmi:idref="EAID_OWNER0001"/>
          <lowerValue xmi:type="uml:LiteralInteger" xmi:id="EAID_LI000003" value="1"/>
          <upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="EAID_LU000003" value="1"/>
        </ownedEnd>
      </packagedElement>
    </packagedElement>
  </uml:Model>
  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
    <elements/>
  </xmi:Extension>
</xmi:XMI>`;
