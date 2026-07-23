(() => {
  "use strict";

  const VERSION = "20260723-data-layer-1";

  async function load({ client, user, applySiloCapacityModels }) {
      const c = client;
      const u = user;
      const results = await Promise.all([
        c.from("profiles").select("*").eq("id", u.id).maybeSingle(),
        c.from("profiles").select("*").order("full_name"),
        c.from("fluid_types").select("*").order("name"),
        c.from("tanks").select("*").order("display_order"),
        c.from("tank_history").select("*").order("created_at", { ascending: false }).limit(500),
        c.from("operations").select("*").order("start_at", { ascending: false }).limit(2000),
        c.from("operation_events").select("*").order("event_time", { ascending: true }).limit(5000),
        c.from("trucks").select("*").order("movement_date", { ascending: false }).limit(2000),
        c.from("qhse_records").select("*").order("record_date", { ascending: false }).limit(1000),
        c.from("action_items").select("*").order("due_date", { ascending: true }).limit(500),
        c.from("equipment").select("*").order("name"),
        c.from("diesel_logs").select("*").order("log_date", { ascending: false }).limit(500),
        c.from("maintenance_orders").select("*").order("opened_at", { ascending: false }).limit(500),
        c.from("certificates").select("*").order("expires_at"),
        c.from("alerts").select("*").order("created_at", { ascending: false }).limit(1000),
        c.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500),
        c.from("attachments").select("*").order("created_at", { ascending: false }).limit(1000),
        c.from("chemical_inventory").select("*").order("product_name").limit(1000),
        c.from("chemical_movements").select("*").order("created_at", { ascending: false }).limit(3000),
        c.from("tank_movements").select("*").order("created_at", { ascending: false }).limit(2000),
        c.from("inventory_alerts").select("*").order("created_at", { ascending: false }),
        c.from("operational_health_alerts").select("*").order("created_at", { ascending: false }),
        c.from("system_errors").select("*").order("created_at", { ascending: false }).limit(50),
        c.from("operation_tank_allocations").select("*").order("display_order", { ascending: true }),
        c.from("handover_pending_items").select("*").order("created_at", { ascending: false }).limit(1000),
        c.from("shift_handover_notes").select("*").order("shift_date", { ascending: false }).limit(500),
        c.from("operational_alert_center").select("*").order("created_at", { ascending: false }).limit(1000),
        c.from("shift_handover_approvals").select("*").order("shift_date", { ascending: false }).limit(500),
        c.from("shift_checklist_items").select("*").order("shift_date", { ascending: false }).limit(2000),
        c.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1500),
        c.from("app_feedback").select("*").order("created_at", { ascending: false }).limit(500),
        c.from("truck_movement_items").select("*").order("display_order", { ascending: true }).limit(5000),
        c.from("chemical_products").select("*").order("name"),
        c.from("operational_closings").select("*").order("closing_date", { ascending: false }).order("shift", { ascending: true }).limit(200),
        c.from("closing_reconciliation_items").select("*").order("created_at", { ascending: false }).limit(10000),
        c.from("inventory_counts").select("*").order("counted_at", { ascending: false }).limit(5000),
        c.from("vessel_schedules").select("*").order("eta", { ascending: true }).limit(1000),
        c.from("latest_vessel_positions").select("*").order("position_time", { ascending: false }).limit(1000),
        c.from("vessel_positions").select("*").order("position_time", { ascending: false }).limit(3000),
        c.from("vessel_geofences").select("*").eq("active", true).order("created_at", { ascending: true }),
        c.from("vessel_ais_alerts").select("*").order("event_at", { ascending: false }).limit(1000),
        c.from("vessel_ais_sync_runs").select("*").order("started_at", { ascending: false }).limit(100),
        c.from("vessel_registry").select("*").order("name", { ascending: true }).limit(2000),
        c.from("dismissed_system_alerts").select("*").order("dismissed_at", { ascending: false }).limit(2000),
        c.from("client_document_tickets").select("*").order("ticket_date", { ascending: false }).order("created_at", { ascending: false }).limit(2000),
        c.from("client_ticket_documents").select("*").order("created_at", { ascending: false }).limit(5000)
      ]);
  
      if (results[0]?.error) throw results[0].error;
  
      const optionalAvailability = {
        vessels: !results[36]?.error,
        vesselPositions: !results[37]?.error,
        vesselPositionHistory: !results[38]?.error,
        vesselGeofences: !results[39]?.error,
        vesselAlerts: !results[40]?.error,
        vesselSyncRuns: !results[41]?.error,
        vesselRegistry: !results[42]?.error
      };
  
      results.forEach((result, index) => {
        if (!result?.error) return;
        console.warn(`Fonte opcional ${index} indisponível:`, result.error);
        results[index] = { data: [] };
      });
  
      const profile = results[0].data || {
        id: u.id,
        email: u.email,
        full_name: u.email,
        role: "user",
        active: true,
        permissions: {}
      };
  
      const data = {
        profile: {
          id: profile.id,
          name: profile.full_name || u.email,
          email: profile.email || u.email,
          role: profile.role || "user",
          department: profile.department || "",
          avatarUrl: profile.avatar_url || "",
          active: profile.active !== false,
          permissions: profile.permissions || {}
        },
        users: (results[1].data || []).map(x => ({
          id: x.id, email: x.email || "", name: x.full_name || x.email || "Usuário",
          role: x.role || "user", department: x.department || "", avatarUrl: x.avatar_url || "", active: x.active !== false,
          permissions: x.permissions || {}, created_at: x.created_at
        })),
        fluids: (results[2].data || []).map(x => ({
          id: x.id, name: x.name, type: x.category, unit: x.default_unit,
          density: Number(x.density_value ?? x.density_ppg ?? 0),
          densityUnit: x.density_unit || (["granel", "insumo"].includes(String(x.category || "").toLowerCase()) ? "t/m³" : "ppg"),
          active: x.active !== false
        })),
        tanks: applySiloCapacityModels((results[3].data || []).map(x => ({
          id: x.id, name: x.name, phase: x.phase, kind: x.kind,
          capacity: Number(x.capacity), unit: x.unit, volume: Number(x.current_volume || 0),
          physicalCapacityM3: x.physical_capacity_m3 === null || x.physical_capacity_m3 === undefined
            ? null : Number(x.physical_capacity_m3),
          fluidTypeId: x.current_fluid_type_id || null,
          product: x.current_product || "", lot: x.current_lot || "",
          density: x.current_density === null || x.current_density === undefined ? null : Number(x.current_density),
          densityUnit: x.current_density_unit || null,
          client: x.client || "A definir",
          status: x.status, order: x.display_order,
          updated_by: x.updated_by, updated_at: x.updated_at
        }))),
        tankHistory: results[4].data || [],
        operations: (results[5].data || []).map(x => {
          const linkedProduct = (results[2].data || []).find(item => item.id === x.fluid_type_id);
          return {
          id: x.id, client: x.client, vessel: x.vessel, vesselRegistryId: x.vessel_registry_id || null, service_order: x.service_order || "",
          rig: x.rig || "", well: x.well || "", ticketNumber: x.ticket_number || "",
          fluidTypeId: x.fluid_type_id || null,
          activity: x.activity, product: linkedProduct?.name || x.product, lot: x.lot || "",
          planned: Number(x.planned_quantity || 0), executed: Number(x.executed_quantity || 0),
          unit: x.unit, status: x.status, start_at: x.start_at, end_at: x.end_at,
          notes: x.notes || "", occurrence: x.occurrence || "", responsible_id: x.responsible_id,
          flow_rate: Number(x.flow_rate || 0), flow_rate_unit: x.flow_rate_unit || "",
          paused_minutes: Number(x.paused_minutes || 0), locked: x.locked === true,
          source_tank_id: x.source_tank_id, destination_tank_id: x.destination_tank_id,
          apply_tank_movement: x.apply_tank_movement === true,
          tank_movement_applied: x.tank_movement_applied === true,
          tank_movement_applied_at: x.tank_movement_applied_at,
          created_by: x.created_by, created_at: x.created_at, updated_at: x.updated_at
        };
        }),
        operationEvents: results[6].data || [],
        trucks: (results[7].data || []).map(x => {
          const linkedProduct = (results[2].data || []).find(item => item.id === x.fluid_type_id);
          const items = (results[31].data || []).filter(item => item.truck_id === x.id).map(item => ({
            id: item.id,
            truckId: item.truck_id,
            chemicalProductId: item.chemical_product_id || null,
            productName: item.product_name,
            lot: item.lot || "",
            quantity: Number(item.quantity || 0),
            unit: item.unit,
            displayOrder: Number(item.display_order || 0),
            created_at: item.created_at,
            updated_at: item.updated_at
          }));
          return {
            id: x.id, date: x.movement_date, movement: x.movement_type,
            truckType: x.truck_type || (["bbl","m³","m3"].includes(String(x.unit || "").toLowerCase()) ? "Tank" : "Bulk"),
            fluidTypeId: x.fluid_type_id || null,
            tankId: x.tank_id || null,
            stockApplied: x.stock_applied === true,
            stockAppliedAt: x.stock_applied_at,
            stockSummary: x.stock_application_summary || {},
            supplier: x.supplier, client: x.client || "",
            product: linkedProduct?.name || x.product, lot: x.lot || "",
            quantity: Number(x.quantity || 0), unit: x.unit, plate: x.plate || "",
            driver: x.driver_name || "", invoice: x.invoice_number || "", status: x.status,
            notes: x.notes || "", items, created_by: x.created_by,
            created_at: x.created_at, updated_at: x.updated_at
          };
        }),
        qhse: (results[8].data || []).map(x => ({
          id: x.id, date: x.record_date, type: x.record_type, title: x.title,
          description: x.description || "", responsible: x.responsible || "",
          severity: x.severity, status: x.status, created_by: x.created_by,
          created_at: x.created_at, updated_at: x.updated_at
        })),
        actionItems: results[9].data || [],
        equipment: (results[10].data || []).map(x => ({
          id: x.id, name: x.name, category: x.category, status: x.status,
          hourmeter: Number(x.hourmeter || 0), last_hours: Number(x.last_work_hours || 0),
          diesel_initial: Number(x.diesel_initial || 0), refueled: Number(x.diesel_refueled || 0),
          diesel_final: Number(x.diesel_final || 0), location: x.location || "",
          next_maintenance_date: x.next_maintenance_date,
          maintenance_due_hourmeter: Number(x.maintenance_due_hourmeter || 0),
          maintenance_interval_hours: Number(x.maintenance_interval_hours || 0),
          notes: x.notes || "", updated_at: x.updated_at
        })),
        dieselLogs: results[11].data || [],
        maintenanceOrders: (results[12].data || []).map(x => ({
          id: x.id, equipment_id: x.equipment_id, title: x.title,
          description: x.description || "", priority: x.priority, status: x.status,
          opened_at: x.opened_at, due_date: x.due_date, closed_at: x.closed_at,
          responsible: x.responsible || "", maintenance_type: x.maintenance_type || "Corretiva",
          parts_used: x.parts_used || "", solution: x.solution || "",
          estimated_cost: Number(x.estimated_cost || 0), actual_cost: Number(x.actual_cost || 0),
          before_notes: x.before_notes || "", after_notes: x.after_notes || ""
        })),
        certificates: (results[13].data || []).map(x => ({
          id: x.id, user_id: x.user_id, title: x.title, owner: x.owner_name,
          issuer: x.issuer || "", issued_at: x.issued_at, expires_at: x.expires_at,
          status: x.status
        })),
        alerts: (results[14].data || []).map(x => ({
          id: x.id, title: x.title, message: x.message, level: x.level,
          target: x.target_group || "", target_user_id: x.target_user_id,
          created_at: x.created_at, read: x.is_read
        })),
        messages: (results[15].data || []).map(x => ({
          id: x.id, sender: x.sender_name, sender_id: x.sender_id,
          text: x.message, created_at: x.created_at, mine: x.sender_id === u.id
        })),
        attachments: (results[16].data || []).map(x => ({
          id: x.id, module: x.module, record_id: x.record_id, file_name: x.file_name,
          file_path: x.file_path, mime_type: x.mime_type, file_size: Number(x.file_size || 0),
          uploaded_by: x.uploaded_by, created_at: x.created_at
        })),
        chemicalProducts: (results[32].data || []).map(x => ({
          id:x.id, name:x.name, category:x.category || "", unit:x.default_unit || "unidade",
          active:x.active !== false, notes:x.notes || "", created_by:x.created_by,
          created_at:x.created_at, updated_at:x.updated_at
        })),
        chemicals: (results[17].data || []).map(x => ({
          id: x.id, productId: x.product_id || null, name: x.product_name, category: x.category || "", lot: x.lot || "",
          unit: x.unit || "kg", quantity: Number(x.quantity || 0),
          minimum: Number(x.minimum_quantity || 0), expiry_date: x.expiry_date,
          location: x.location || "", supplier: x.supplier || "",
          status: x.status || "Disponível", notes: x.notes || "",
          created_by: x.created_by, updated_by: x.updated_by,
          created_at: x.created_at, updated_at: x.updated_at
        })),
        chemicalMovements: (results[18].data || []).map(x => ({
          id: x.id, inventory_id: x.inventory_id, movement_type: x.movement_type,
          quantity: Number(x.quantity || 0), previous_balance: Number(x.previous_balance || 0),
          new_balance: Number(x.new_balance || 0), reference: x.reference || "",
          notes: x.notes || "", performed_by: x.performed_by,
          chemicalProductId: x.chemical_product_id || null, truckId: x.truck_id || null,
          created_at: x.created_at
        })),
        tankMovements: (results[19].data || []).map(x => ({
          id: x.id, movement_type: x.movement_type, source_tank_id: x.source_tank_id,
          destination_tank_id: x.destination_tank_id, operation_id: x.operation_id,
          truckId: x.truck_id || null,
          quantity: Number(x.quantity || 0), unit: x.unit, product: x.product || "",
          lot: x.lot || "", reference: x.reference || "", notes: x.notes || "",
          created_by: x.created_by, created_at: x.created_at
        })),
        systemAlerts: [...(results[20].data || []), ...(results[21].data || [])],
        systemErrors: results[22].data || [],
        operationAllocations: (results[23].data || []).map(x => ({
          id: x.id, operation_id: x.operation_id, direction: x.direction,
          tank_id: x.tank_id, quantity: Number(x.quantity || 0), unit: x.unit,
          display_order: Number(x.display_order || 0), created_by: x.created_by,
          created_at: x.created_at, updated_at: x.updated_at
        })),
        handoverPendings: (results[24].data || []).map(x => ({
          id: x.id, title: x.title, description: x.description || "",
          category: x.category, responsible: x.responsible || "",
          priority: x.priority, status: x.status, due_at: x.due_at,
          created_by: x.created_by, completed_by: x.completed_by,
          completed_at: x.completed_at, created_at: x.created_at, updated_at: x.updated_at
        })),
        handoverNotes: (results[25].data || []).map(x => ({
          id: x.id, shift_date: x.shift_date, shift_type: x.shift_type,
          observations: x.observations || "", updated_by: x.updated_by,
          created_at: x.created_at, updated_at: x.updated_at
        })),
        alertCenter: (results[26].data || []).map(x => ({
          id: x.alert_key, title: x.title, message: x.message || "", level: x.level || "Média",
          category: x.category || "Sistema", entity_type: x.entity_type, entity_id: x.entity_id,
          due_at: x.due_at, created_at: x.created_at, action_page: x.action_page || "alerts", automatic: true
        })),
        handoverApprovals: (results[27].data || []).map(x => ({
          id:x.id, sequence_no:Number(x.sequence_no||0), shift_date:x.shift_date, shift_type:x.shift_type,
          status:x.status, snapshot_json:x.snapshot_json||{}, snapshot_text:x.snapshot_text||"",
          delivered_by:x.delivered_by, delivered_at:x.delivered_at, received_by:x.received_by,
          received_at:x.received_at, reopened_by:x.reopened_by, reopened_at:x.reopened_at,
          created_at:x.created_at, updated_at:x.updated_at
        })),
        shiftChecklist: (results[28].data || []).map(x => ({
          id:x.id, shift_date:x.shift_date, shift_type:x.shift_type, item_key:x.item_key,
          item_label:x.item_label, category:x.category, completed:x.completed,
          notes:x.notes||"", completed_by:x.completed_by, completed_at:x.completed_at,
          created_by:x.created_by, created_at:x.created_at, updated_at:x.updated_at
        })),
        auditLogs: (results[29].data || []).map(x => ({
          id:x.id, table_name:x.table_name, record_id:x.record_id, action:x.action,
          old_data:x.old_data, new_data:x.new_data, changed_by:x.changed_by, created_at:x.created_at
        })),
        feedback: (results[30].data || []).map(x => ({
          id:x.id, category:x.category, page:x.page || "dashboard", rating:x.rating,
          message:x.message, device_info:x.device_info || "", app_version:x.app_version || "",
          status:x.status || "Novo", created_by:x.created_by, created_at:x.created_at, updated_at:x.updated_at
        })),
        truckItems: (results[31].data || []).map(item => ({
          id:item.id, truckId:item.truck_id, chemicalProductId:item.chemical_product_id || null,
          productName:item.product_name, lot:item.lot || "", quantity:Number(item.quantity || 0),
          unit:item.unit, displayOrder:Number(item.display_order || 0),
          created_at:item.created_at, updated_at:item.updated_at
        })),
        closings: (results[33].data || []).map(item => ({
          id:item.id, date:item.closing_date, shift:item.shift, periodStart:item.period_start,
          periodEnd:item.period_end, status:item.status, summary:item.summary || {},
          notes:item.notes || "", closedBy:item.closed_by, closedAt:item.closed_at,
          reopenedBy:item.reopened_by, reopenedAt:item.reopened_at,
          created_at:item.created_at, updated_at:item.updated_at
        })),
        closingItems: (results[34].data || []).map(item => ({
          id:item.id, closingId:item.closing_id, itemType:item.item_type, itemId:item.item_id,
          itemName:item.item_name, unit:item.unit,
          theoretical:Number(item.theoretical_quantity || 0),
          measured:item.measured_quantity === null ? null : Number(item.measured_quantity),
          variance:item.variance === null ? null : Number(item.variance),
          variancePct:item.variance_pct === null ? null : Number(item.variance_pct),
          status:item.status, created_at:item.created_at
        })),
        inventoryCounts: (results[35].data || []).map(item => ({
          id:item.id, countedAt:item.counted_at, shift:item.shift, itemType:item.item_type,
          itemId:item.item_id, measured:Number(item.measured_quantity || 0),
          unit:item.unit, notes:item.notes || "", createdBy:item.created_by
        })),
        vessels: (results[36].data || []).map(item => ({
          id:item.id, vesselName:item.vessel_name, imo:item.imo || "", mmsi:item.mmsi || "",
          client:item.client, berth:item.berth || "", operationType:item.operation_type || "Bombeio",
          product:item.product || "", plannedQuantity:Number(item.planned_quantity || 0), unit:item.unit || "bbl",
          eta:item.eta, etb:item.etb, etd:item.etd, destination:item.destination || "", status:item.status || "Programada",
          priority:item.priority || "Normal", notes:item.notes || "", aisEnabled:item.ais_enabled === true,
          aisProvider:item.ais_provider || "MarineTraffic", aisEta:item.ais_eta,
          distanceToPortNm:item.distance_to_port_nm === null || item.distance_to_port_nm === undefined ? null : Number(item.distance_to_port_nm),
          aisSyncStatus:item.ais_sync_status || "Pendente", aisSyncMessage:item.ais_sync_message || "",
          lastAisAt:item.last_ais_at, createdBy:item.created_by, updatedBy:item.updated_by,
          createdAt:item.created_at, updatedAt:item.updated_at
        })),
        vesselPositions: (results[37].data || []).map(item => ({
          id:item.id, scheduleId:item.schedule_id, latitude:Number(item.latitude), longitude:Number(item.longitude),
          speedKnots:item.speed_knots === null ? null : Number(item.speed_knots),
          courseDegrees:item.course_degrees === null ? null : Number(item.course_degrees),
          headingDegrees:item.heading_degrees === null ? null : Number(item.heading_degrees),
          navigationStatus:item.navigation_status || "", positionTime:item.position_time,
          source:item.source || "manual", createdAt:item.created_at
        })),
        vesselPositionHistory: (results[38].data || []).map(item => ({
          id:item.id, scheduleId:item.schedule_id, latitude:Number(item.latitude), longitude:Number(item.longitude),
          speedKnots:item.speed_knots === null ? null : Number(item.speed_knots),
          courseDegrees:item.course_degrees === null ? null : Number(item.course_degrees),
          headingDegrees:item.heading_degrees === null ? null : Number(item.heading_degrees),
          navigationStatus:item.navigation_status || "", positionTime:item.position_time,
          source:item.source || "manual", createdAt:item.created_at
        })),
        vesselGeofences: (results[39].data || []).map(item => ({
          id:item.id, name:item.name, latitude:Number(item.latitude), longitude:Number(item.longitude),
          radiusNm:Number(item.radius_nm || 25), alertOnEntry:item.alert_on_entry !== false,
          active:item.active !== false, createdAt:item.created_at, updatedAt:item.updated_at
        })),
        vesselAisAlerts: (results[40].data || []).map(item => ({
          id:item.id, scheduleId:item.schedule_id, type:item.alert_type, severity:item.severity,
          title:item.title, message:item.message || "", eventAt:item.event_at,
          resolvedAt:item.resolved_at, resolvedBy:item.resolved_by,
          metadata:item.metadata || {}, createdAt:item.created_at
        })),
        vesselAisSyncRuns: (results[41].data || []).map(item => ({
          id:item.id, provider:item.provider, status:item.status,
          processed:Number(item.processed_count || 0), updated:Number(item.updated_count || 0),
          failed:Number(item.failed_count || 0), message:item.message || "",
          startedAt:item.started_at, finishedAt:item.finished_at, requestedBy:item.requested_by
        })),
        vesselRegistry: (results[42].data || []).map(item => ({
          id:item.id, name:item.name, imo:item.imo || "", mmsi:item.mmsi || "",
          active:item.active !== false, createdBy:item.created_by, updatedBy:item.updated_by,
          createdAt:item.created_at, updatedAt:item.updated_at
        })),
        dismissedSystemAlerts: (results[43].data || []).map(item => ({
          id:item.id, alertKey:item.alert_key, title:item.title || "", category:item.category || "",
          dismissedBy:item.dismissed_by, dismissedAt:item.dismissed_at
        })),
        clientTickets: (results[44].data || []).map(item => ({
          id:item.id, ticketNumber:item.ticket_number, client:item.client, title:item.title,
          date:item.ticket_date, operationId:item.operation_id || null, vessel:item.vessel || "",
          serviceOrder:item.service_order || "", responsible:item.responsible || "", status:item.status,
          requiredTypes:Array.isArray(item.required_document_types) ? item.required_document_types : ["FDT","FRT","MDT","MRT"],
          notes:item.notes || "", createdBy:item.created_by, createdAt:item.created_at, updatedAt:item.updated_at
        })),
        clientTicketDocuments: (results[45].data || []).map(item => ({
          id:item.id, ticketId:item.ticket_id, documentType:item.document_type,
          documentNumber:item.document_number || "", documentDate:item.document_date || "", revision:item.revision || "",
          status:item.status || "Anexado", fileName:item.file_name, filePath:item.file_path, mimeType:item.mime_type || "",
          fileSize:Number(item.file_size || 0), notes:item.notes || "", uploadedBy:item.uploaded_by,
          createdAt:item.created_at, updatedAt:item.updated_at
        })),
        vesselRegistryAvailable: optionalAvailability.vesselRegistry,
        vesselModuleAvailable: optionalAvailability.vessels,
        vesselPositionsAvailable: optionalAvailability.vesselPositions,
        vesselMonitoringAvailable: optionalAvailability.vesselPositionHistory && optionalAvailability.vesselGeofences && optionalAvailability.vesselAlerts
      };
      const dismissedAlertKeys = new Set((data.dismissedSystemAlerts || []).map(item => String(item.alertKey || "")));
      data.systemAlerts = [...data.systemAlerts, ...data.alertCenter]
        .filter((item,index,all) => all.findIndex(other => String(other.id || other.alert_key || other.title) === String(item.id || item.alert_key || item.title)) === index)
        .filter(item => !dismissedAlertKeys.has(String(item.id || item.alert_key || item.title || "")));
      return Object.freeze({ data, lastSync: new Date() });
    }

  window.OpsControlData = Object.freeze({ version: VERSION, load });
})();
