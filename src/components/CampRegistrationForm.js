import React, { useState } from 'react';
import './CampRegistrationForm.css';

const CampRegistrationForm = () => {
  const [formData, setFormData] = useState({
    campName: '',
    campLocation: '',
    campDate: '',
    campDescription: ''
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
    if (formData.campName && formData.campLocation && formData.campDate && formData.campDescription) {
      setFormValid(true);
      // Add your form submission logic here
    } else {
      setFormValid(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Camp Name:</label>
        <input type="text" name="campName" value={formData.campName} onChange={handleChange} required />
      </div>
      <div>
        <label>Camp Location:</label>
        <input type="text" name="campLocation" value={formData.campLocation} onChange={handleChange} required />
      </div>
      <div>
        <label>Camp Date:</label>
        <input type="date" name="campDate" value={formData.campDate} onChange={handleChange} required />
      </div>
      <div>
        <label>Camp Description:</label>
        <textarea name="campDescription" value={formData.campDescription} onChange={handleChange} required />
      </div>
      <button type="submit">Create Camp</button>
      {!formValid && <div className="error-message">Please fill out all required fields.</div>}
    </form>
  );
};

export default CampRegistrationForm;
