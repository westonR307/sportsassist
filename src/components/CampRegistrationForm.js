import React, { useState } from 'react';
import './CampRegistrationForm.css';

const CampRegistrationForm = () => {
  const [formData, setFormData] = useState({
    campName: '',
    startDate: '',
    endDate: '',
    location: '',
    description: ''
  });

  const [formValid, setFormValid] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { campName, startDate, endDate, location, description } = formData;

    if (campName && startDate && endDate && location && description) {
      setFormValid(true);
      // Submit form data to the server or perform any other necessary actions
    } else {
      setFormValid(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Camp Name:</label>
        <input
          type="text"
          name="campName"
          value={formData.campName}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Start Date:</label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>End Date:</label>
        <input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Location:</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label>Description:</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </div>
      {!formValid && <p className="error-message">Please fill out all required fields.</p>}
      <button type="submit">Create Camp</button>
    </form>
  );
};

export default CampRegistrationForm;
